import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";

type CartWithPromoItem = {
	// basic cart product fields
	id: string;
	cartId: string;
	productId: string;
	storeId: string;
	quantity: number;
	createdAt: Date;
	updatedAt: Date;
	deletedAt?: Date | null;
	// product included as from prisma
	product: any;
	// extras computed
	appliedDiscount?: {
		id: string;
		name: string;
		type: string;
		valueType: string;
		value: number;
		maxDiscountAmount?: number | null;
	} | null;
	discountAmount?: number; // per unit
	activePrice?: number; // per unit after discount
	isDiscountActive?: boolean;
	bogo?: {
		buyQuantity: number;
		getQuantity: number;
		applyToSameProduct: boolean;
		maxBogoSets?: number | null;
	} | null;
};

type ComputedCartItem = CartWithPromoItem & {
	availability: {
		status: "AVAILABLE" | "OUT_OF_STOCK" | "NOT_AVAILABLE";
		currentStock: number;
	};
};

export class CartService {
	async getCartCount(userId: string, activeStoreId: string) {
		const count = await prisma.$transaction(async (tx) => {
			const cart = await tx.cart.findFirst({
				where: { userId },
				select: { id: true },
			});

			if (!cart) {
				throw new ApiError(400, "User doesnt have cart yet");
			}

			// --- BAGIAN 1: SINKRONISASI KERANJANG (DIREVISI) ---
			const items = await tx.cartProduct.findMany({
				where: { cartId: cart.id },
				select: { id: true, productId: true, storeId: true, quantity: true },
			});

			if (items.length > 0) {
				for (const it of items) {
					// Lewati item yang sudah pada store aktif
					if (it.storeId === activeStoreId) continue;

					// Cari product pada store aktif (target)
					const targetStoreProduct = await tx.storeProduct.findUnique({
						where: {
							storeId_productId: {
								storeId: activeStoreId,
								productId: it.productId,
							},
						},
						select: { stock: true },
					});

					// Jika product tidak ada pada store aktif -> jangan ubah apa-apa (jangan delete)
					if (!targetStoreProduct) {
						continue;
					}

					await tx.cartProduct.upsert({
						where: {
							cartId_productId_storeId: {
								cartId: cart.id,
								productId: it.productId,
								storeId: activeStoreId,
							},
						},
						update: { quantity: { increment: it.quantity } },
						create: {
							cartId: cart.id,
							productId: it.productId,
							storeId: activeStoreId,
							quantity: it.quantity,
						},
					});

					// Setelah upsert, hapus item lama di store asal
					await tx.cartProduct.delete({ where: { id: it.id } });
				}
			}

			// --- BAGIAN 2: HITUNG ITEM YANG TERSEDIA PADA activeStoreId ---
			const finalCartItems = await tx.cartProduct.findMany({
				where: { cartId: cart.id, storeId: activeStoreId },
				select: { productId: true, quantity: true },
			});

			if (finalCartItems.length === 0) {
				return 0;
			}

			// Ambil data stok untuk semua produk relevan dalam satu query
			const productIds = finalCartItems.map((item) => item.productId);
			const stocks = await tx.storeProduct.findMany({
				where: {
					storeId: activeStoreId,
					productId: { in: productIds },
				},
				select: { productId: true, stock: true },
			});

			const stockMap = new Map(stocks.map((s) => [s.productId, s.stock]));

			// Hitung hanya item yang kuantitasnya mencukupi stok
			const availableItemsCount = finalCartItems.reduce((acc, item) => {
				const currentStock = stockMap.get(item.productId) ?? 0;
				if (currentStock >= item.quantity) {
					return acc + 1;
				}
				return acc;
			}, 0);

			return availableItemsCount;
		});

		return count;
	}

	async getUserCart(userId: string) {
		const now = new Date();

		const cart = await prisma.cart.findFirst({
			where: { userId },
			include: {
				items: {
					include: {
						product: true,
					},
				},
			},
		});

		if (!cart) return null;

		const cartWithComputed = await prisma.$transaction(async (tx) => {
			type Key = string; 

			const pairs = new Set<Key>();
			const storeIdsSet = new Set<string>();
			const productIdsSet = new Set<string>();

			for (const item of cart.items) {
				pairs.add(`${item.storeId}:${item.productId}`);
				storeIdsSet.add(item.storeId);
				productIdsSet.add(item.productId);
			}

			const storeIds = Array.from(storeIdsSet);
			const productIds = Array.from(productIdsSet);

			// Cari semua storeProduct yang match salah satu pasangan
			const storeProducts = await tx.storeProduct.findMany({
				where: {
					storeId: { in: storeIds },
					productId: { in: productIds },
				},
				select: { storeId: true, productId: true, stock: true },
			});

			const storeProductMap = new Map<Key, number>();
			for (const sp of storeProducts) {
				storeProductMap.set(`${sp.storeId}:${sp.productId}`, sp.stock ?? 0);
			}

			// --- AMBIL SEMUA discount yang relevan SEKALI ---
			const discounts = await tx.discount.findMany({
				where: {
					storeId: { in: storeIds },
					isActive: true,
					startDate: { lte: now },
					endDate: { gte: now },
					products: {
						some: {
							productId: { in: productIds },
						},
					},
				},
				include: {
					bogoConfig: true,
					products: {
						select: { productId: true }, 
					},
				},
			});

			const discountIndex = new Map<string, any[]>(); 
			for (const d of discounts) {
				for (const p of d.products || []) {
					const key = `${d.storeId}:${p.productId}`;
					const arr = discountIndex.get(key) ?? [];
					arr.push(d);
					discountIndex.set(key, arr);
				}
			}

			const mappedItems: ComputedCartItem[] = [];

			for (const item of cart.items) {
				const product = item.product;
				const basePrice: number = product.price;

				const key = `${item.storeId}:${product.id}`;
				const currentStock = storeProductMap.get(key) ?? null;

				// availability rules:
				// - jika storeProduct tidak ada -> kategori "not_avaible" (tetap jangan hapus)
				// - jika ada tapi stock < quantity -> "OUT_OF_STOCK"
				// - jika ada dan stock >= quantity -> "AVAILABLE"
				let availabilityStatus: ComputedCartItem["availability"];
				if (currentStock === null) {
					availabilityStatus = {
						status: "NOT_AVAILABLE", 
						currentStock: 0,
					};
				} else {
					const numericStock = currentStock ?? 0;
					availabilityStatus = {
						status:
							numericStock >= item.quantity ? "AVAILABLE" : "OUT_OF_STOCK",
						currentStock: numericStock,
					};
				}

				// ambil discounts relevan dari index (jika ada)
				const candidateDiscounts = discountIndex.get(key) ?? [];

				// pilih best discount (maksimal nominal potongan) seperti sebelumnya
				let bestDiscount: any = null;
				let bestDiscountAmount = 0;
				for (const d of candidateDiscounts) {
					let discountAmount = 0;
					if (d.valueType === "PERCENTAGE") {
						discountAmount = Math.floor((basePrice * d.value) / 100);
						if (d.maxDiscountAmount) {
							discountAmount = Math.min(discountAmount, d.maxDiscountAmount);
						}
					} else if (d.valueType === "NOMINAL") {
						discountAmount = d.value;
					}

					if (discountAmount > bestDiscountAmount) {
						bestDiscountAmount = discountAmount;
						bestDiscount = d;
					}
				}

				const activePrice = Math.max(0, basePrice - bestDiscountAmount);
				const bogo =
					candidateDiscounts.find((d) => d.bogoConfig)?.bogoConfig ?? null;

				mappedItems.push({
					id: item.id,
					cartId: item.cartId,
					productId: item.productId,
					storeId: item.storeId,
					quantity: item.quantity,
					createdAt: item.createdAt,
					updatedAt: item.updatedAt,
					deletedAt: item.deletedAt,
					product,
					appliedDiscount: bestDiscount
						? {
								id: bestDiscount.id,
								name: bestDiscount.name,
								type: bestDiscount.type,
								valueType: bestDiscount.valueType,
								value: bestDiscount.value,
								maxDiscountAmount: bestDiscount.maxDiscountAmount ?? null,
							}
						: null,
					discountAmount: bestDiscountAmount,
					activePrice,
					isDiscountActive: !!bestDiscount,
					bogo: bogo
						? {
								buyQuantity: bogo.buyQuantity,
								getQuantity: bogo.getQuantity,
								applyToSameProduct: bogo.applyToSameProduct,
								maxBogoSets: bogo.maxBogoSets ?? null,
							}
						: null,
					availability: availabilityStatus,
				});
			}

			return {
				...cart,
				items: mappedItems,
			};
		});

		return cartWithComputed;
	}

	async addProductToCart(userId: string, storeId: string, productId: string) {
		const cart = await prisma.cart.findFirst({
			where: { userId },
			select: { id: true },
		});

		if (!cart) {
			throw new ApiError(400, "User is not Found");
		}

		const stock = await prisma.storeProduct.findFirst({
			where: { productId, storeId },
			select: { stock: true },
		});
		if (!stock) {
			throw new ApiError(400, "Product is not Found");
		}
		if (stock.stock <= 0) {
			throw new ApiError(400, "Product is out of stock");
		}

		const addProduct = await prisma.cartProduct.findFirst({
			where: { cartId: cart.id, productId, storeId },
		});
		if (addProduct) {
			await prisma.cartProduct.update({
				where: { id: addProduct.id },
				data: { quantity: addProduct.quantity + 1 },
			});
			return addProduct;
		}

		const cartProduct = await prisma.cartProduct.create({
			data: {
				cartId: cart.id,
				productId,
				storeId,
				quantity: 1,
			},
		});
		return cartProduct;
	}

	async updateCartProductQuantity(
		userId: string,
		storeId: string,
		productId: string,
		quantity: number
	) {
		const cart = await prisma.cart.findFirst({
			where: { userId },
			select: { id: true },
		});

		if (!cart) {
			throw new ApiError(400, "User is not Found");
		}
		if (quantity === 0) {
			const cartProduct = await prisma.cartProduct.delete({
				where: {
					cartId_productId_storeId: { cartId: cart.id, productId, storeId },
				},
			});
			return cartProduct;
		} else {
			await prisma.$transaction(async (tx) => {
				const stock = await tx.storeProduct.findFirst({
					where: {
						productId,
						storeId,
					},
					select: {
						stock: true,
					},
				});
				if (!stock) {
					throw new ApiError(400, "Product is not Found on this store");
				}
				if (stock && stock.stock < quantity) {
					throw new ApiError(400, "Not enough stock");
				}
				const cartProduct = await tx.cartProduct.update({
					where: {
						cartId_productId_storeId: { cartId: cart.id, productId, storeId },
					},
					data: {
						quantity,
					},
				});
				return cartProduct;
			});
		}
	}
}
