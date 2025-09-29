import {
	PrismaClient,
	DiscountType,
	DiscountValueType,
	Prisma,
} from '../generated/prisma';
import { ApiError } from '../utils/ApiError';

const prisma = new PrismaClient();

interface CreateDiscountDto {
	storeId: string | null; // null for global discounts
	name: string;
	description?: string;
	type: DiscountType;
	valueType?: DiscountValueType; // Optional for BOGO discounts
	value?: number; // Optional for BOGO discounts
	maxDiscountAmount?: number;
	minTransactionValue?: number;
	maxUsagePerCustomer?: number;
	totalUsageLimit?: number;
	startDate: Date;
	endDate: Date;
	productIds: string[];
	adminId: string;
	// BOGO specific fields
	buyQuantity?: number;
	getQuantity?: number;
	applyToSameProduct?: boolean;
	maxBogoSets?: number;
}

interface UpdateDiscountDto {
	name?: string;
	description?: string;
	value?: number;
	maxDiscountAmount?: number;
	minTransactionValue?: number;
	maxUsagePerCustomer?: number;
	totalUsageLimit?: number;
	isActive?: boolean;
	startDate?: Date;
	endDate?: Date;
	productIds?: string[];
	// BOGO specific fields
	buyQuantity?: number;
	getQuantity?: number;
	applyToSameProduct?: boolean;
	maxBogoSets?: number;
}

interface ApplyDiscountDto {
	discountId: string;
	transactionId?: string;
	userId?: string;
	adminId?: string;
	orderTotal: number;
}

interface DiscountFilter {
	storeId?: string;
	type?: DiscountType;
	isActive?: boolean;
	dateFrom?: Date;
	dateTo?: Date;
	page?: number;
	limit?: number;
}

export class DiscountService {
	static async createDiscount(data: CreateDiscountDto) {
		try {
			// Validate discount value (skip for BOGO discounts)
			if (data.type !== DiscountType.BOGO) {
				if (
					data.valueType === DiscountValueType.PERCENTAGE &&
					data.value !== undefined &&
					(data.value < 1 || data.value > 100)
				) {
					throw new ApiError(
						400,
						'Percentage discount must be between 1 and 100'
					);
				}

				if (
					data.valueType === DiscountValueType.NOMINAL &&
					data.value !== undefined &&
					data.value <= 0
				) {
					throw new ApiError(400, 'Nominal discount must be greater than 0');
				}
			}

			// Validate dates
			if (new Date(data.startDate) >= new Date(data.endDate)) {
				throw new ApiError(400, 'Start date must be before end date');
			}

			// Validate BOGO fields
			if (data.type === DiscountType.BOGO) {
				if (!data.buyQuantity || !data.getQuantity) {
					throw new ApiError(
						400,
						'BOGO discount requires buyQuantity and getQuantity'
					);
				}
				if (data.buyQuantity <= 0 || data.getQuantity <= 0) {
					throw new ApiError(400, 'BOGO quantities must be greater than 0');
				}
			}

			// Verify products exist
			if (data.storeId) {
				// Store-specific discount: verify products belong to the store
				const products = await prisma.storeProduct.findMany({
					where: {
						storeId: data.storeId,
						productId: { in: data.productIds },
						deletedAt: null,
						product: {
							isActive: true,
							deletedAt: null,
						},
					},
					include: {
						product: true,
					},
				});

				if (products.length !== data.productIds.length) {
					throw new ApiError(
						400,
						'Some products not found or not available in this store'
					);
				}
			} else {
				// Global discount: verify products exist (regardless of store)
				const products = await prisma.product.findMany({
					where: {
						id: { in: data.productIds },
						isActive: true,
						deletedAt: null,
					},
				});

				if (products.length !== data.productIds.length) {
					throw new ApiError(400, 'Some products not found or inactive');
				}
			}

			// Check for existing active discounts on the same products
			const whereConditions = {
				isActive: true,
				// Check if discount period overlaps
				AND: [
					{ startDate: { lte: data.endDate } },
					{ endDate: { gte: data.startDate } },
				],
				products: {
					some: {
						productId: { in: data.productIds },
					},
				},
			};

			// Add store condition based on discount type
			let storeCondition = {};
			if (data.storeId) {
				// Store-specific discount: check for conflicts with same store and global discounts
				storeCondition = {
					OR: [{ storeId: data.storeId }, { storeId: null }],
				};
			} else {
				// Global discount: check for conflicts with all existing discounts (all stores)
				storeCondition = {};
			}

			const existingDiscounts = await prisma.discount.findMany({
				where: {
					...whereConditions,
					...storeCondition,
				},
				include: {
					products: {
						include: {
							product: {
								select: { name: true },
							},
						},
					},
					store: {
						select: { name: true },
					},
				},
			});

			if (existingDiscounts.length > 0) {
				const conflictingProducts = existingDiscounts.flatMap((discount) =>
					discount.products
						.filter((p: any) => data.productIds.includes(p.productId))
						.map((p: any) => p.product.name)
				);
				const uniqueProducts = [...new Set(conflictingProducts)];

				throw new ApiError(
					409,
					`Products already have active discounts: ${uniqueProducts.join(', ')}. Only one discount per product is allowed.`
				);
			}

			return await prisma.$transaction(async (tx) => {
				// Create the discount
				const discountData: any = {
					storeId: data.storeId,
					name: data.name,
					description: data.description,
					type: data.type,
					minTransactionValue: data.minTransactionValue,
					maxUsagePerCustomer: data.maxUsagePerCustomer,
					totalUsageLimit: data.totalUsageLimit,
					startDate: data.startDate,
					endDate: data.endDate,
					adminId: data.adminId,
				};

				// Handle value-related fields based on discount type
				if (data.type !== DiscountType.BOGO) {
					discountData.valueType = data.valueType;
					discountData.value = data.value;
					discountData.maxDiscountAmount = data.maxDiscountAmount;
				} else {
					// For BOGO discounts, provide default values since DB requires them
					discountData.valueType = DiscountValueType.PERCENTAGE;
					discountData.value = 0; // Not used for BOGO logic
					discountData.maxDiscountAmount = null;
				}

				const discount = await tx.discount.create({
					data: discountData,
				});

				// Create discount-product associations
				await tx.discountProduct.createMany({
					data: data.productIds.map((productId) => ({
						discountId: discount.id,
						productId,
					})),
				});

				// Create BOGO configuration if needed
				if (data.type === DiscountType.BOGO) {
					await tx.bogoDiscount.create({
						data: {
							discountId: discount.id,
							buyQuantity: data.buyQuantity!,
							getQuantity: data.getQuantity!,
							applyToSameProduct: data.applyToSameProduct ?? true,
							maxBogoSets: data.maxBogoSets,
						},
					});
				}

				return discount;
			});
		} catch (error) {
			console.error('Error creating discount:', error);
			if (error instanceof ApiError) throw error;
			throw new ApiError(500, 'Failed to create discount');
		}
	}

	static async updateDiscount(
		discountId: string,
		data: UpdateDiscountDto,
		adminId: string
	) {
		try {
			// Verify discount exists and admin has permission
			const existingDiscount = await prisma.discount.findUnique({
				where: { id: discountId, deletedAt: null },
				include: {
					admin: true,
					store: true,
				},
			});

			if (!existingDiscount) {
				throw new ApiError(404, 'Discount not found');
			}

			// Check permissions - Super admin can edit any, Store admin only their store's discounts
			const admin = await prisma.admin.findUnique({
				where: { id: adminId, deletedAt: null },
			});

			if (!admin) {
				throw new ApiError(404, 'Admin not found');
			}

			if (!admin.isSuper && admin.storeId !== existingDiscount.storeId) {
				throw new ApiError(403, 'You can only edit discounts for your store');
			}

			// Validate new values if provided
			if (data.value !== undefined) {
				if (
					existingDiscount.valueType === DiscountValueType.PERCENTAGE &&
					(data.value < 1 || data.value > 100)
				) {
					throw new ApiError(
						400,
						'Percentage discount must be between 1 and 100'
					);
				}
				if (
					existingDiscount.valueType === DiscountValueType.NOMINAL &&
					data.value <= 0
				) {
					throw new ApiError(400, 'Nominal discount must be greater than 0');
				}
			}

			if (
				data.startDate &&
				data.endDate &&
				new Date(data.startDate) >= new Date(data.endDate)
			) {
				throw new ApiError(400, 'Start date must be before end date');
			}

			return await prisma.$transaction(async (tx) => {
				// Update the discount
				const updatedDiscount = await tx.discount.update({
					where: { id: discountId },
					data: {
						name: data.name,
						description: data.description,
						value: data.value,
						maxDiscountAmount: data.maxDiscountAmount,
						minTransactionValue: data.minTransactionValue,
						maxUsagePerCustomer: data.maxUsagePerCustomer,
						totalUsageLimit: data.totalUsageLimit,
						isActive: data.isActive,
						startDate: data.startDate,
						endDate: data.endDate,
					},
				});

				// Update product associations if provided
				if (data.productIds) {
					// Verify products exist
					if (existingDiscount.storeId) {
						// Store-specific discount: verify products belong to the store
						const products = await tx.storeProduct.findMany({
							where: {
								storeId: existingDiscount.storeId,
								productId: { in: data.productIds },
								deletedAt: null,
							},
						});

						if (products.length !== data.productIds.length) {
							throw new ApiError(
								400,
								'Some products not found or not available in this store'
							);
						}
					} else {
						// Global discount: verify products exist (regardless of store)
						const products = await tx.product.findMany({
							where: {
								id: { in: data.productIds },
								isActive: true,
								deletedAt: null,
							},
						});

						if (products.length !== data.productIds.length) {
							throw new ApiError(400, 'Some products not found or inactive');
						}
					}

					// Remove existing associations
					await tx.discountProduct.deleteMany({
						where: { discountId },
					});

					// Create new associations
					await tx.discountProduct.createMany({
						data: data.productIds.map((productId) => ({
							discountId,
							productId,
						})),
					});
				}

				// Update BOGO configuration if needed
				if (existingDiscount.type === DiscountType.BOGO) {
					const bogoData: any = {};
					if (data.buyQuantity !== undefined)
						bogoData.buyQuantity = data.buyQuantity;
					if (data.getQuantity !== undefined)
						bogoData.getQuantity = data.getQuantity;
					if (data.applyToSameProduct !== undefined)
						bogoData.applyToSameProduct = data.applyToSameProduct;
					if (data.maxBogoSets !== undefined)
						bogoData.maxBogoSets = data.maxBogoSets;

					if (Object.keys(bogoData).length > 0) {
						await tx.bogoDiscount.update({
							where: { discountId },
							data: bogoData,
						});
					}
				}

				return updatedDiscount;
			});
		} catch (error) {
			if (error instanceof ApiError) throw error;
			throw new ApiError(500, 'Failed to update discount');
		}
	}

	static async deleteDiscount(discountId: string, adminId: string) {
		try {
			// Verify discount exists and admin has permission
			const existingDiscount = await prisma.discount.findUnique({
				where: { id: discountId, deletedAt: null },
			});

			if (!existingDiscount) {
				throw new ApiError(404, 'Discount not found');
			}

			const admin = await prisma.admin.findUnique({
				where: { id: adminId, deletedAt: null },
			});

			if (!admin) {
				throw new ApiError(404, 'Admin not found');
			}

			if (!admin.isSuper && admin.storeId !== existingDiscount.storeId) {
				throw new ApiError(403, 'You can only delete discounts for your store');
			}

			return await prisma.discount.update({
				where: { id: discountId },
				data: {
					deletedAt: new Date(),
					isActive: false,
				},
			});
		} catch (error) {
			if (error instanceof ApiError) throw error;
			throw new ApiError(500, 'Failed to delete discount');
		}
	}

	static async getDiscounts(filter: DiscountFilter = {}) {
		try {
			const { page = 1, limit = 20, ...whereConditions } = filter;
			const skip = (page - 1) * limit;

			const where: Prisma.DiscountWhereInput = {
				deletedAt: null,
			};

			// Handle storeId filtering to include global discounts
			if (filter.storeId) {
				where.OR = [
					{ storeId: filter.storeId }, // Store-specific discounts
					{ storeId: null }, // Global discounts
				];
			} else if (filter.storeId === null) {
				where.storeId = null; // Only global discounts
			}

			// Add other filter conditions
			if (filter.type) where.type = filter.type;
			if (filter.isActive !== undefined) where.isActive = filter.isActive;
			if (filter.dateFrom || filter.dateTo) {
				where.AND = [];
				if (filter.dateFrom) {
					where.AND.push({
						startDate: { gte: filter.dateFrom },
					});
				}
				if (filter.dateTo) {
					where.AND.push({
						endDate: { lte: filter.dateTo },
					});
				}
			}

			const [discounts, total] = await Promise.all([
				prisma.discount.findMany({
					where,
					include: {
						store: {
							select: { id: true, name: true, city: true, province: true },
						},
						admin: { select: { id: true, name: true, email: true } },
						products: {
							include: {
								product: {
									select: {
										id: true,
										name: true,
										picture1: true,
										price: true,
									},
								},
							},
						},
						bogoConfig: true,
						_count: {
							select: {
								usageHistory: true,
							},
						},
					},
					orderBy: { createdAt: 'desc' },
					skip,
					take: limit,
				}),
				prisma.discount.count({ where }),
			]);

			return {
				data: discounts,
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			};
		} catch (error) {
			throw new ApiError(500, 'Failed to get discounts');
		}
	}

	static async getDiscountById(discountId: string) {
		try {
			const discount = await prisma.discount.findUnique({
				where: { id: discountId, deletedAt: null },
				include: {
					store: {
						select: { id: true, name: true, city: true, province: true },
					},
					admin: { select: { id: true, name: true, email: true } },
					products: {
						include: {
							product: {
								select: {
									id: true,
									name: true,
									picture1: true,
									price: true,
								},
							},
						},
					},
					bogoConfig: true,
					usageHistory: {
						include: {
							user: { select: { id: true, name: true, email: true } },
							appliedBy: { select: { id: true, name: true } },
						},
						orderBy: { usedAt: 'desc' },
						take: 10, // Latest 10 usage records
					},
					_count: {
						select: {
							usageHistory: true,
						},
					},
				},
			});

			if (!discount) {
				throw new ApiError(404, 'Discount not found');
			}

			return discount;
		} catch (error) {
			if (error instanceof ApiError) throw error;
			throw new ApiError(500, 'Failed to get discount');
		}
	}

	static async applyDiscount(data: ApplyDiscountDto) {
		try {
			const discount = await prisma.discount.findUnique({
				where: { id: data.discountId, deletedAt: null },
				include: {
					usageHistory: {
						where: {
							userId: data.userId || undefined,
						},
					},
				},
			});

			if (!discount) {
				throw new ApiError(404, 'Discount not found');
			}

			// Check if discount is active and within date range
			const now = new Date();
			if (!discount.isActive) {
				throw new ApiError(400, 'Discount is not active');
			}

			if (now < discount.startDate || now > discount.endDate) {
				throw new ApiError(400, 'Discount is not valid at this time');
			}

			// Check usage limits
			if (
				discount.totalUsageLimit &&
				discount.currentUsageCount >= discount.totalUsageLimit
			) {
				throw new ApiError(400, 'Discount usage limit reached');
			}

			if (discount.maxUsagePerCustomer && data.userId) {
				const userUsageCount = discount.usageHistory.length;
				if (userUsageCount >= discount.maxUsagePerCustomer) {
					throw new ApiError(
						400,
						'You have reached the maximum usage limit for this discount'
					);
				}
			}

			// Check minimum transaction value
			if (
				discount.minTransactionValue &&
				data.orderTotal < discount.minTransactionValue
			) {
				throw new ApiError(
					400,
					`Minimum transaction value of ${discount.minTransactionValue} required`
				);
			}

			// Calculate discount value
			let discountValue = 0;
			if (discount.valueType === DiscountValueType.PERCENTAGE) {
				discountValue = Math.floor((data.orderTotal * discount.value) / 100);
				if (
					discount.maxDiscountAmount &&
					discountValue > discount.maxDiscountAmount
				) {
					discountValue = discount.maxDiscountAmount;
				}
			} else {
				discountValue = discount.value;
			}

			// Record usage and update counter
			const usageHistory = await prisma.$transaction(async (tx) => {
				// Create usage history
				const usage = await tx.discountUsageHistory.create({
					data: {
						discountId: data.discountId,
						transactionId: data.transactionId,
						userId: data.userId,
						adminId: data.adminId,
						discountValue,
						orderTotal: data.orderTotal,
					},
				});

				// Update usage counter
				await tx.discount.update({
					where: { id: data.discountId },
					data: {
						currentUsageCount: { increment: 1 },
					},
				});

				return usage;
			});

			return {
				discountValue,
				discountName: discount.name,
				usageHistory,
			};
		} catch (error) {
			if (error instanceof ApiError) throw error;
			throw new ApiError(500, 'Failed to apply discount');
		}
	}

	static async getDiscountReport(
		storeId?: string,
		dateFrom?: Date,
		dateTo?: Date,
		page = 1,
		limit = 20
	) {
		try {
			const skip = (page - 1) * limit;

			const where: Prisma.DiscountUsageHistoryWhereInput = {
				discount: {
					deletedAt: null,
					...(storeId && { storeId }),
				},
			};

			if (dateFrom || dateTo) {
				where.usedAt = {};
				if (dateFrom) where.usedAt.gte = dateFrom;
				if (dateTo) where.usedAt.lte = dateTo;
			}

			const [usageHistory, total] = await Promise.all([
				prisma.discountUsageHistory.findMany({
					where,
					include: {
						discount: {
							select: {
								id: true,
								name: true,
								type: true,
								valueType: true,
								value: true,
								store: {
									select: { id: true, name: true, city: true, province: true },
								},
							},
						},
						user: { select: { id: true, name: true, email: true } },
						appliedBy: { select: { id: true, name: true } },
					},
					orderBy: { usedAt: 'desc' },
					skip,
					take: limit,
				}),
				prisma.discountUsageHistory.count({ where }),
			]);

			// Calculate summary statistics
			const summary = await prisma.discountUsageHistory.aggregate({
				where,
				_sum: {
					discountValue: true,
					orderTotal: true,
				},
				_count: {
					id: true,
				},
			});

			return {
				data: usageHistory,
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
				summary: {
					totalDiscountGiven: summary._sum.discountValue || 0,
					totalOrderValue: summary._sum.orderTotal || 0,
					totalUsages: summary._count.id,
					averageDiscountPerOrder:
						summary._count.id > 0
							? Math.round(
									(summary._sum.discountValue || 0) / summary._count.id
								)
							: 0,
				},
			};
		} catch (error) {
			throw new ApiError(500, 'Failed to get discount report');
		}
	}

	static async getAvailableDiscounts(
		storeId: string,
		orderTotal: number,
		productIds: string[]
	) {
		try {
			const now = new Date();

			const discounts = await prisma.discount.findMany({
				where: {
					storeId,
					isActive: true,
					deletedAt: null,
					startDate: { lte: now },
					endDate: { gte: now },
					OR: [
						{ totalUsageLimit: null },
						{
							AND: [
								{ totalUsageLimit: { not: null } },
								{
									currentUsageCount: {
										lt: prisma.discount.fields.totalUsageLimit,
									},
								},
							],
						},
					],
					products: {
						some: {
							productId: { in: productIds },
						},
					},
				},
				include: {
					products: {
						include: {
							product: {
								select: {
									id: true,
									name: true,
									picture1: true,
								},
							},
						},
					},
					bogoConfig: true,
				},
				orderBy: { createdAt: 'desc' },
			});

			// Filter discounts based on conditions and calculate potential savings
			const applicableDiscounts = discounts
				.filter((discount) => {
					// Check minimum transaction value
					if (
						discount.minTransactionValue &&
						orderTotal < discount.minTransactionValue
					) {
						return false;
					}
					return true;
				})
				.map((discount) => {
					let potentialSavings = 0;

					if (discount.valueType === DiscountValueType.PERCENTAGE) {
						potentialSavings = Math.floor((orderTotal * discount.value) / 100);
						if (
							discount.maxDiscountAmount &&
							potentialSavings > discount.maxDiscountAmount
						) {
							potentialSavings = discount.maxDiscountAmount;
						}
					} else {
						potentialSavings = discount.value;
					}

					return {
						...discount,
						potentialSavings,
					};
				})
				.sort((a, b) => b.potentialSavings - a.potentialSavings); // Sort by highest savings first

			return applicableDiscounts;
		} catch (error) {
			throw new ApiError(500, 'Failed to get available discounts');
		}
	}
}
