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

			// Ambil semua item (id, product, store, qty)
			const items = await tx.cartProduct.findMany({
				where: { cartId: cart.id },
				select: { id: true, productId: true, storeId: true, quantity: true },
			});

			if (items.length > 0) {
				const hasMismatch = items.some((it) => it.storeId !== activeStoreId);

				if (hasMismatch) {
					for (const it of items) {
						if (it.storeId === activeStoreId) continue;

						// Pastikan produk tersedia di store baru
						const sp = await tx.storeProduct.findUnique({
							where: {
								storeId_productId: {
									storeId: activeStoreId,
									productId: it.productId,
								},
							},
							select: { stock: true },
						});

						if (!sp || sp.stock <= 0) {
							// Kebijakan: hapus item yang tidak tersedia di store baru
							await tx.cartProduct.delete({ where: { id: it.id } });
							continue;
						}

						// Upsert ke kombinasi (cartId, productId, activeStoreId)
						await tx.cartProduct.upsert({
							where: {
								cartId_productId_storeId: {
									cartId: cart.id,
									productId: it.productId,
									storeId: activeStoreId,
								},
							},
							update: {
								quantity: { increment: it.quantity },
								updatedAt: new Date(),
							},
							create: {
								cartId: cart.id,
								productId: it.productId,
								storeId: activeStoreId,
								quantity: it.quantity,
							},
						});

						// Hapus baris lama (store lama)
						await tx.cartProduct.delete({ where: { id: it.id } });
					}
				}
			}

			// Hitung ulang total item setelah remap (atau jika tidak perlu remap)
			const total = await tx.cartProduct.count({
				where: { cartId: cart.id },
			});

			return total;
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

		// We'll run inside a transaction to keep reads consistent (optional)
		const cartWithComputed = await prisma.$transaction(async (tx) => {
			// map items and compute discounts
			const mappedItems: CartWithPromoItem[] = [];

			for (const item of cart.items) {
				const product = item.product;
				const basePrice: number = product.price;

				// Find discounts that:
				// - belong to the same store as the cart item
				// - are active (isActive)
				// - within start/end date range
				// - apply to this product (via DiscountProduct)
				const discounts = await tx.discount.findMany({
					where: {
						storeId: item.storeId,
						isActive: true,
						startDate: { lte: now },
						endDate: { gte: now },
						products: {
							some: {
								productId: product.id,
							},
						},
					},
					include: {
						bogoConfig: true,
					},
				});

				// compute best discount (max saving) among discounts found
				let bestDiscount: any = null;
				let bestDiscountAmount = 0;

				for (const d of discounts) {
					// compute discount amount per unit
					let discountAmount = 0;
					if (d.valueType === "PERCENTAGE") {
						// percent value expected 1..100
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

				// Build item result
				const activePrice = Math.max(0, basePrice - bestDiscountAmount);

				// If BOGO present for any discount, pick first BOGO config (if any)
				const bogo = discounts.find((d) => d.bogoConfig)
					? discounts.find((d) => d.bogoConfig)!.bogoConfig
					: null;

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
				});
			}

			// Return cart object with mapped items
			return {
				...cart,
				items: mappedItems,
			} as typeof cart & { items: CartWithPromoItem[] };
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
