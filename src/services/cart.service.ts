import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";

type CartWithPromoItem = {
	id: string;
	cartId: string;
	productId: string;
	storeId: string;
	quantity: number;
	createdAt: Date;
	updatedAt: Date;
	deletedAt?: Date | null;
	product: any;
	appliedDiscount?: {
		id: string;
		name: string;
		type: string;
		valueType: string;
		value: number;
		maxDiscountAmount?: number | null;
	} | null;
	discountAmount?: number;
	activePrice?: number;
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

			const storeIdsSet = new Set<string>();
			const productIdsSet = new Set<string>();
			const productQuantityMap = new Map<string, number>();

			for (const item of cart.items) {
				storeIdsSet.add(item.storeId);
				productIdsSet.add(item.productId);
				const currentQty = productQuantityMap.get(item.productId) || 0;
				productQuantityMap.set(item.productId, currentQty + item.quantity);
			}

			const storeIds = Array.from(storeIdsSet);
			const productIds = Array.from(productIdsSet);

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

			const discounts = await tx.discount.findMany({
				where: {
					isActive: true,
					startDate: { lte: now },
					endDate: { gte: now },
					OR: [{ storeId: { in: storeIds } }, { storeId: null }],
				},
				include: {
					bogoConfig: true,
					products: { select: { productId: true } },
				},
			});

			const discountIndex = new Map<string, any[]>();
			for (const d of discounts) {
				if (d.storeId === null) {
					if (d.products.length === 0) {
						for (const item of cart.items) {
							const key = `${item.storeId}:${item.productId}`;
							const arr = discountIndex.get(key) ?? [];
							arr.push(d);
							discountIndex.set(key, arr);
						}
					} else {
						const discountedProductIds = new Set(
							d.products.map((p) => p.productId)
						);
						for (const item of cart.items) {
							if (discountedProductIds.has(item.productId)) {
								const key = `${item.storeId}:${item.productId}`;
								const arr = discountIndex.get(key) ?? [];
								arr.push(d);
								discountIndex.set(key, arr);
							}
						}
					}
				} else {
					if (d.products.length === 0) {
						for (const item of cart.items) {
							if (item.storeId === d.storeId) {
								const key = `${d.storeId}:${item.productId}`;
								const arr = discountIndex.get(key) ?? [];
								arr.push(d);
								discountIndex.set(key, arr);
							}
						}
					} else {
						for (const p of d.products) {
							const key = `${d.storeId}:${p.productId}`;
							const arr = discountIndex.get(key) ?? [];
							arr.push(d);
							discountIndex.set(key, arr);
						}
					}
				}
			}

			const mappedItems: ComputedCartItem[] = [];

			for (const item of cart.items) {
				const product = item.product;
				const basePrice: number = product.price;
				const key = `${item.storeId}:${product.id}`;
				const currentStock = storeProductMap.get(key) ?? null;

				const availabilityStatus: ComputedCartItem["availability"] = {
					status:
						currentStock === null
							? "NOT_AVAILABLE"
							: currentStock >= item.quantity
								? "AVAILABLE"
								: "OUT_OF_STOCK",
					currentStock: currentStock ?? 0,
				};

				const candidateDiscounts = discountIndex.get(key) ?? [];
				let bestDiscount: any = null;
				let bestDiscountPerUnit = 0;

				for (const d of candidateDiscounts) {
					let currentDiscountPerUnit = 0;

					if (d.type === "BOGO" && d.bogoConfig) {
						const totalQuantityForProduct =
							productQuantityMap.get(item.productId) || 0;
						const { buyQuantity, getQuantity, maxBogoSets } = d.bogoConfig;
						const totalRequiredItems = buyQuantity + getQuantity;

						if (totalQuantityForProduct >= totalRequiredItems) {
							const maxPossibleSets = Math.floor(
								totalQuantityForProduct / totalRequiredItems
							);
							const actualSets = maxBogoSets
								? Math.min(maxPossibleSets, maxBogoSets)
								: maxPossibleSets;
							const totalFreeItems = actualSets * getQuantity;
							const totalDiscountValue = totalFreeItems * basePrice;
							// Average the discount across all units of this product in the cart
							currentDiscountPerUnit =
								totalDiscountValue / totalQuantityForProduct;
						}
					} else if (d.type !== "BOGO") {
						if (d.valueType === "PERCENTAGE") {
							let amount = Math.floor((basePrice * d.value) / 100);
							if (d.maxDiscountAmount) {
								amount = Math.min(amount, d.maxDiscountAmount);
							}
							currentDiscountPerUnit = amount;
						} else if (d.valueType === "NOMINAL") {
							currentDiscountPerUnit = d.value;
						}
					}

					if (currentDiscountPerUnit > bestDiscountPerUnit) {
						bestDiscountPerUnit = currentDiscountPerUnit;
						bestDiscount = d;
					}
				}

				const finalActivePrice = Math.max(0, basePrice - bestDiscountPerUnit);

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
					discountAmount: bestDiscountPerUnit,
					activePrice: finalActivePrice,
					isDiscountActive: !!bestDiscount,
					bogo: bestDiscount?.bogoConfig
						? {
								buyQuantity: bestDiscount.bogoConfig.buyQuantity,
								getQuantity: bestDiscount.bogoConfig.getQuantity,
								applyToSameProduct: bestDiscount.bogoConfig.applyToSameProduct,
								maxBogoSets: bestDiscount.bogoConfig.maxBogoSets ?? null,
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

	async addProductToCart(
		userId: string,
		storeId: string | number,
		productId: string | number
	) {
		const storeIdStr = String(storeId);
		const productIdStr = String(productId);

		const cart = await prisma.cart.upsert({
			where: { userId },
			update: {},
			create: { userId },
		});

		const stock = await prisma.storeProduct.findFirst({
			where: { productId: productIdStr, storeId: storeIdStr },
			select: { stock: true },
		});
		if (!stock) {
			throw new ApiError(400, "Product is not found in this store");
		}
		if (stock.stock <= 0) {
			throw new ApiError(400, "Product is out of stock");
		}

		const result = await prisma.$transaction(async (tx) => {
			const existing = await tx.cartProduct.findFirst({
				where: {
					cartId: cart.id,
					productId: productIdStr,
					storeId: storeIdStr,
				},
				select: { id: true, quantity: true },
			});

			if (existing && existing.quantity >= stock.stock) {
				throw new ApiError(400, "Cannot add more, stock limit reached");
			}

			if (existing) {
				const updated = await tx.cartProduct.update({
					where: { id: existing.id },
					data: { quantity: { increment: 1 } },
				});
				return updated;
			}

			const created = await tx.cartProduct.create({
				data: {
					cartId: cart.id,
					productId: productIdStr,
					storeId: storeIdStr,
					quantity: 1,
				},
			});

			return created;
		});

		return result;
	}

	async updateCartProductQuantity(
		userId: string,
		storeId: string,
		productId: string,
		quantity: number
	): Promise<{ message: string }> {
		const cart = await prisma.cart.findFirst({
			where: { userId },
			select: { id: true },
		});

		if (!cart) {
			throw new ApiError(400, "User is not Found");
		}
		if (quantity === 0) {
			await prisma.cartProduct.delete({
				where: {
					cartId_productId_storeId: { cartId: cart.id, productId, storeId },
				},
			});
			return { message: "Product removed from cart" };
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
				await tx.cartProduct.update({
					where: {
						cartId_productId_storeId: { cartId: cart.id, productId, storeId },
					},
					data: {
						quantity,
					},
				});
			});
			return { message: "Cart quantity updated" };
		}
	}

	async applyManualDiscount(
		adminId: string,
		userId: string,
		discountId: string,
		storeId?: string
	) {
		return await prisma.$transaction(async (tx) => {
			const discount = await tx.discount.findFirst({
				where: {
					id: discountId,
					type: "MANUAL",
					isActive: true,
					...(storeId && { storeId }),
				},
				include: {
					products: {
						include: {
							product: true,
						},
					},
					bogoConfig: true,
				},
			});

			if (!discount) {
				throw new ApiError(404, "Manual discount not found or not available");
			}

			// Check if discount is within date range
			const now = new Date();
			if (discount.startDate > now || discount.endDate < now) {
				throw new ApiError(400, "Discount is not active at this time");
			}

			// Check usage limits
			if (discount.totalUsageLimit) {
				const currentUsage = await tx.discountUsageHistory.count({
					where: { discountId: discount.id },
				});
				if (currentUsage >= discount.totalUsageLimit) {
					throw new ApiError(400, "Discount usage limit exceeded");
				}
			}

			if (discount.maxUsagePerCustomer) {
				const userUsage = await tx.discountUsageHistory.count({
					where: {
						discountId: discount.id,
						userId: userId,
					},
				});
				if (userUsage >= discount.maxUsagePerCustomer) {
					throw new ApiError(
						400,
						"User has reached maximum usage for this discount"
					);
				}
			}

			// Get user's cart
			const cart = await tx.cart.findFirst({
				where: { userId },
				include: {
					items: {
						include: {
							product: true,
						},
					},
				},
			});

			if (!cart || cart.items.length === 0) {
				throw new ApiError(400, "Cart is empty");
			}

			// Calculate discount value
			const applicableItems = cart.items.filter((item) =>
				discount.products.some((dp) => dp.productId === item.productId)
			);

			if (applicableItems.length === 0) {
				throw new ApiError(
					400,
					"No applicable products in cart for this discount"
				);
			}

			const orderTotal = cart.items.reduce((total, item) => {
				return total + item.product.price * item.quantity;
			}, 0);

			// Check minimum transaction value
			if (
				discount.minTransactionValue &&
				orderTotal < discount.minTransactionValue
			) {
				throw new ApiError(
					400,
					`Minimum transaction value of ${discount.minTransactionValue} not met`
				);
			}

			let totalDiscountValue = 0;

			for (const item of applicableItems) {
				const basePrice = item.product.price;
				let discountAmount = 0;

				if (discount.type === "BOGO" && discount.bogoConfig) {
					// Calculate BOGO discount
					const { buyQuantity, getQuantity, maxBogoSets } = discount.bogoConfig;
					const totalRequiredItems = buyQuantity + getQuantity;
					const maxPossibleSets = Math.floor(
						item.quantity / totalRequiredItems
					);
					const actualSets = maxBogoSets
						? Math.min(maxPossibleSets, maxBogoSets)
						: maxPossibleSets;
					const freeItems = actualSets * getQuantity;

					if (discount.valueType === "PERCENTAGE") {
						discountAmount = Math.floor(
							(basePrice * discount.value * freeItems) / 100
						);
					} else if (discount.valueType === "NOMINAL") {
						discountAmount = discount.value * freeItems;
					}
				} else {
					// Regular discount calculation
					if (discount.valueType === "PERCENTAGE") {
						discountAmount = Math.floor(
							(basePrice * item.quantity * discount.value) / 100
						);
						if (discount.maxDiscountAmount) {
							discountAmount = Math.min(
								discountAmount,
								discount.maxDiscountAmount
							);
						}
					} else if (discount.valueType === "NOMINAL") {
						discountAmount = discount.value * item.quantity;
					}
				}

				totalDiscountValue += discountAmount;
			}

			// Record usage history
			const usageHistory = await tx.discountUsageHistory.create({
				data: {
					discountId: discount.id,
					userId: userId,
					adminId: adminId,
					discountValue: totalDiscountValue,
					orderTotal: orderTotal,
					usedAt: now,
				},
			});

			return {
				discount: {
					id: discount.id,
					name: discount.name,
					type: discount.type,
				},
				appliedValue: totalDiscountValue,
				orderTotal: orderTotal,
				finalTotal: orderTotal - totalDiscountValue,
				usageHistory,
			};
		});
	}
}
