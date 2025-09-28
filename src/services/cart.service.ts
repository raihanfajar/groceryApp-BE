import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';

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
		status: 'AVAILABLE' | 'OUT_OF_STOCK';
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
				throw new ApiError(400, 'User doesnt have cart yet');
			}

			// --- BAGIAN 1: SINKRONISASI KERANJANG ---
			const items = await tx.cartProduct.findMany({
				where: { cartId: cart.id },
				select: { id: true, productId: true, storeId: true, quantity: true },
			});

			if (items.length > 0) {
				const hasMismatch = items.some((it) => it.storeId !== activeStoreId);

				if (hasMismatch) {
					for (const it of items) {
						if (it.storeId === activeStoreId) continue;
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
							await tx.cartProduct.delete({ where: { id: it.id } });
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

						// Hapus item dari storeid yang lama
						await tx.cartProduct.delete({ where: { id: it.id } });
					}
				}
			}

			// --- BAGIAN 2: HITUNG ITEM YANG TERSEDIA ---
			// Ambil item yang sudah tersinkronisasi
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
					return acc + 1; // Tambahkan 1 ke total hitungan
				}
				return acc; // Jangan hitung jika stok kurang
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
			// Calculate total cart value first for MINIMUM_PURCHASE discount validation
			const cartTotal = cart.items.reduce((total, item) => {
				return total + item.product.price * item.quantity;
			}, 0);

			const mappedItems: ComputedCartItem[] = [];

			for (const item of cart.items) {
				const product = item.product;
				const basePrice: number = product.price;

				// --- LOGIKA PENGECEKAN STOK YANG DISEDERHANAKAN ---
				const stockData = await tx.storeProduct.findFirst({
					where: { storeId: item.storeId, productId: product.id },
					select: { stock: true },
				});
				const currentStock = stockData?.stock ?? 0;

				const availabilityStatus: ComputedCartItem['availability'] = {
					status: currentStock >= item.quantity ? 'AVAILABLE' : 'OUT_OF_STOCK',
					currentStock: currentStock,
				};
				// --- AKHIR LOGIKA PENGECEKAN STOK ---

				// Get all applicable discounts (excluding global discounts which need different query)
				const storeDiscounts = await tx.discount.findMany({
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

				// Get global discounts (where storeId is null)
				const globalDiscounts = await tx.discount.findMany({
					where: {
						storeId: null,
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

				const allDiscounts = [...storeDiscounts, ...globalDiscounts];

				// Filter discounts based on type and conditions
				const eligibleDiscounts = allDiscounts.filter((discount) => {
					// MANUAL discounts should not be auto-applied
					if (discount.type === 'MANUAL') return false;

					// MINIMUM_PURCHASE should check cart total
					if (discount.type === 'MINIMUM_PURCHASE') {
						return cartTotal >= (discount.minTransactionValue || 0);
					}

					// REGULAR and BOGO can be auto-applied
					return true;
				});

				let bestDiscount: any = null;
				let bestDiscountAmount = 0;

				for (const d of eligibleDiscounts) {
					let discountAmount = 0;

					if (d.type === 'BOGO' && d.bogoConfig) {
						// Calculate BOGO discount
						const { buyQuantity, getQuantity, maxBogoSets } = d.bogoConfig;
						const totalRequiredItems = buyQuantity + getQuantity;
						const maxPossibleSets = Math.floor(
							item.quantity / totalRequiredItems
						);
						const actualSets = maxBogoSets
							? Math.min(maxPossibleSets, maxBogoSets)
							: maxPossibleSets;
						const freeItems = actualSets * getQuantity;

						if (d.valueType === 'PERCENTAGE') {
							// For BOGO, percentage is usually 100% (free items)
							discountAmount = Math.floor(
								(basePrice * d.value * freeItems) / 100
							);
						} else if (d.valueType === 'NOMINAL') {
							discountAmount = d.value * freeItems;
						}
					} else {
						// Regular discount calculation for REGULAR and MINIMUM_PURCHASE
						if (d.valueType === 'PERCENTAGE') {
							discountAmount = Math.floor((basePrice * d.value) / 100);
							if (d.maxDiscountAmount) {
								discountAmount = Math.min(discountAmount, d.maxDiscountAmount);
							}
						} else if (d.valueType === 'NOMINAL') {
							discountAmount = d.value;
						}
					}

					if (discountAmount > bestDiscountAmount) {
						bestDiscountAmount = discountAmount;
						bestDiscount = d;
					}
				}

				const activePrice = Math.max(0, basePrice - bestDiscountAmount);
				const bogo =
					eligibleDiscounts.find((d: any) => d.bogoConfig)?.bogoConfig ?? null;

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

					// Tambahkan properti 'availability' yang baru di sini
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
			throw new ApiError(400, 'User is not Found');
		}

		const stock = await prisma.storeProduct.findFirst({
			where: { productId, storeId },
			select: { stock: true },
		});
		if (!stock) {
			throw new ApiError(400, 'Product is not Found');
		}
		if (stock.stock <= 0) {
			throw new ApiError(400, 'Product is out of stock');
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
			throw new ApiError(400, 'User is not Found');
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
					throw new ApiError(400, 'Product is not Found on this store');
				}
				if (stock && stock.stock < quantity) {
					throw new ApiError(400, 'Not enough stock');
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

	async applyManualDiscount(
		adminId: string,
		userId: string,
		discountId: string,
		storeId?: string
	) {
		return await prisma.$transaction(async (tx) => {
			// Verify discount exists and is MANUAL type
			const discount = await tx.discount.findFirst({
				where: {
					id: discountId,
					type: 'MANUAL',
					isActive: true,
					...(storeId && { storeId }), // For store admin, restrict to their store
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
				throw new ApiError(404, 'Manual discount not found or not available');
			}

			// Check if discount is within date range
			const now = new Date();
			if (discount.startDate > now || discount.endDate < now) {
				throw new ApiError(400, 'Discount is not active at this time');
			}

			// Check usage limits
			if (discount.totalUsageLimit) {
				const currentUsage = await tx.discountUsageHistory.count({
					where: { discountId: discount.id },
				});
				if (currentUsage >= discount.totalUsageLimit) {
					throw new ApiError(400, 'Discount usage limit exceeded');
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
						'User has reached maximum usage for this discount'
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
				throw new ApiError(400, 'Cart is empty');
			}

			// Calculate discount value
			const applicableItems = cart.items.filter((item) =>
				discount.products.some((dp) => dp.productId === item.productId)
			);

			if (applicableItems.length === 0) {
				throw new ApiError(
					400,
					'No applicable products in cart for this discount'
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

				if (discount.type === 'BOGO' && discount.bogoConfig) {
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

					if (discount.valueType === 'PERCENTAGE') {
						discountAmount = Math.floor(
							(basePrice * discount.value * freeItems) / 100
						);
					} else if (discount.valueType === 'NOMINAL') {
						discountAmount = discount.value * freeItems;
					}
				} else {
					// Regular discount calculation
					if (discount.valueType === 'PERCENTAGE') {
						discountAmount = Math.floor(
							(basePrice * item.quantity * discount.value) / 100
						);
						if (discount.maxDiscountAmount) {
							discountAmount = Math.min(
								discountAmount,
								discount.maxDiscountAmount
							);
						}
					} else if (discount.valueType === 'NOMINAL') {
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
