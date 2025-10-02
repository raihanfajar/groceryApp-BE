import { StockMovement, StoreProduct, StockJournal } from '../generated/prisma';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';

export interface StockUpdateInput {
	productId: string;
	storeId: string;
	quantity: number;
	type: StockMovement;
	notes?: string;
	adminId: string;
	transactionId?: string;
}

export interface BulkStockUpdateInput {
	storeId: string;
	adminId: string;
	items: Array<{
		productId: string;
		quantity: number;
		type: StockMovement;
		notes?: string;
	}>;
}

export interface StockJournalFilters {
	storeId?: string;
	productId?: string;
	adminId?: string;
	type?: StockMovement;
	dateFrom?: Date;
	dateTo?: Date;
}

export interface InventoryReport {
	totalProducts: number;
	totalStock: number;
	lowStockProducts: number;
	outOfStockProducts: number;
	recentMovements: number;
	stockByCategory: Array<{
		categoryId: string;
		categoryName: string;
		totalStock: number;
		productCount: number;
	}>;
}

export class InventoryService {
	/**
	 * Update stock for a single product with journal entry
	 */
	static async updateStock(data: StockUpdateInput): Promise<StoreProduct> {
		const {
			productId,
			storeId,
			quantity,
			type,
			notes,
			adminId,
			transactionId,
		} = data;

		return await prisma.$transaction(async (tx) => {
			// Validate product exists and is active
			const product = await tx.product.findFirst({
				where: {
					id: productId,
					deletedAt: null,
					isActive: true,
				},
			});

			if (!product) {
				throw new ApiError(404, 'Product not found or inactive');
			}

			// Validate store exists
			const store = await tx.store.findFirst({
				where: {
					id: storeId,
					deletedAt: null,
				},
			});

			if (!store) {
				throw new ApiError(404, 'Store not found');
			}

			// Validate admin exists and has permission
			const admin = await tx.admin.findFirst({
				where: {
					id: adminId,
					deletedAt: null,
				},
			});

			if (!admin) {
				throw new ApiError(404, 'Admin not found');
			}

			// Check if admin has permission for this store
			if (!admin.isSuper && admin.storeId !== storeId) {
				throw new ApiError(
					403,
					'Admin can only manage inventory for their assigned store'
				);
			}

			// Get current stock
			let currentStoreProduct = await tx.storeProduct.findFirst({
				where: {
					productId,
					storeId,
					deletedAt: null,
				},
			});

			const beforeStock = currentStoreProduct?.stock || 0;
			let afterStock: number;

			// Calculate new stock based on movement type
			switch (type) {
				case 'IN':
				case 'INITIAL':
					afterStock = beforeStock + quantity;
					break;
				case 'OUT':
					afterStock = beforeStock - quantity;
					if (afterStock < 0) {
						throw new ApiError(400, 'Insufficient stock for OUT movement');
					}
					break;
				case 'ADJUSTMENT':
					afterStock = quantity; // Direct adjustment to specific value
					break;
				case 'TRANSFER':
					// For transfer, quantity should be negative for source store
					afterStock = beforeStock + quantity;
					if (afterStock < 0) {
						throw new ApiError(400, 'Insufficient stock for transfer');
					}
					break;
				default:
					throw new ApiError(400, 'Invalid stock movement type');
			}

			// Update or create store product
			if (currentStoreProduct) {
				currentStoreProduct = await tx.storeProduct.update({
					where: {
						storeId_productId: {
							storeId,
							productId,
						},
					},
					data: {
						stock: afterStock,
					},
				});
			} else {
				currentStoreProduct = await tx.storeProduct.create({
					data: {
						productId,
						storeId,
						stock: afterStock,
					},
				});
			}

			// Create stock journal entry
			await tx.stockJournal.create({
				data: {
					storeId,
					productId,
					adminId,
					transactionId,
					type,
					quantity: Math.abs(quantity),
					beforeStock,
					afterStock,
					notes,
				},
			});

			return currentStoreProduct;
		});
	}

	/**
	 * Bulk stock update for multiple products
	 */
	static async bulkUpdateStock(
		data: BulkStockUpdateInput
	): Promise<StoreProduct[]> {
		const { storeId, adminId, items } = data;

		const results: StoreProduct[] = [];

		for (const item of items) {
			const result = await this.updateStock({
				storeId,
				adminId,
				productId: item.productId,
				quantity: item.quantity,
				type: item.type,
				notes: item.notes,
			});
			results.push(result);
		}

		return results;
	}

	/**
	 * Get stock journal with filters and pagination
	 */
	static async getStockJournal(
		filters: StockJournalFilters = {},
		page: number = 1,
		limit: number = 20
	) {
		const { storeId, productId, adminId, type, dateFrom, dateTo } = filters;

		const whereClause: any = {};

		if (storeId) whereClause.storeId = storeId;
		if (productId) whereClause.productId = productId;
		if (adminId) whereClause.adminId = adminId;
		if (type) whereClause.type = type;

		if (dateFrom || dateTo) {
			whereClause.createdAt = {};
			if (dateFrom) whereClause.createdAt.gte = dateFrom;
			if (dateTo) whereClause.createdAt.lte = dateTo;
		}

		const skip = (page - 1) * limit;

		const [journals, total] = await Promise.all([
			prisma.stockJournal.findMany({
				where: whereClause,
				include: {
					storeProduct: {
						include: {
							product: {
								select: {
									id: true,
									name: true,
									picture1: true,
								},
							},
							store: {
								select: {
									id: true,
									name: true,
								},
							},
						},
					},
					admin: {
						select: {
							id: true,
							name: true,
							email: true,
						},
					},
					transaction: {
						select: {
							id: true,
							status: true,
						},
					},
				},
				orderBy: {
					createdAt: 'desc',
				},
				skip,
				take: limit,
			}),
			prisma.stockJournal.count({
				where: whereClause,
			}),
		]);

		return {
			data: journals,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		};
	}

	/**
	 * Get inventory summary for a store
	 */
	static async getInventorySummary(storeId: string): Promise<InventoryReport> {
		// Total products with stock in this store
		const storeProducts = await prisma.storeProduct.findMany({
			where: {
				storeId,
				deletedAt: null,
				product: {
					deletedAt: null,
					isActive: true,
				},
			},
			include: {
				product: {
					include: {
						category: {
							select: {
								id: true,
								name: true,
							},
						},
					},
				},
			},
		});

		const totalProducts = storeProducts.length;
		const totalStock = storeProducts.reduce((sum, sp) => sum + sp.stock, 0);
		const lowStockProducts = storeProducts.filter(
			(sp) => sp.stock <= (sp.minStock || 5)
		).length;
		const outOfStockProducts = storeProducts.filter(
			(sp) => sp.stock === 0
		).length;

		// Recent movements (last 7 days)
		const sevenDaysAgo = new Date();
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

		const recentMovements = await prisma.stockJournal.count({
			where: {
				storeId,
				createdAt: {
					gte: sevenDaysAgo,
				},
			},
		});

		// Stock by category
		const categoryMap = new Map<
			string,
			{ name: string; totalStock: number; productCount: number }
		>();

		storeProducts.forEach((sp) => {
			const categoryId = sp.product.category.id;
			const categoryName = sp.product.category.name;

			if (categoryMap.has(categoryId)) {
				const existing = categoryMap.get(categoryId)!;
				existing.totalStock += sp.stock;
				existing.productCount += 1;
			} else {
				categoryMap.set(categoryId, {
					name: categoryName,
					totalStock: sp.stock,
					productCount: 1,
				});
			}
		});

		const stockByCategory = Array.from(categoryMap.entries()).map(
			([categoryId, data]) => ({
				categoryId,
				categoryName: data.name,
				totalStock: data.totalStock,
				productCount: data.productCount,
			})
		);

		return {
			totalProducts,
			totalStock,
			lowStockProducts,
			outOfStockProducts,
			recentMovements,
			stockByCategory,
		};
	}

	/**
	 * Get low stock alerts for a store
	 */
	static async getLowStockAlerts(storeId?: string) {
		const whereClause: any = {
			deletedAt: null,
			product: {
				deletedAt: null,
				isActive: true,
			},
		};

		// Add storeId filter only if provided
		if (storeId) {
			whereClause.storeId = storeId;
		}

		const lowStockProducts = await prisma.storeProduct.findMany({
			where: whereClause,
			include: {
				product: {
					include: {
						category: {
							select: {
								id: true,
								name: true,
							},
						},
					},
				},
				store: {
					select: {
						id: true,
						name: true,
						city: true,
					},
				},
			},
		});

		return lowStockProducts
			.filter((sp) => sp.stock <= (sp.minStock || 5))
			.map((sp) => ({
				...sp,
				isOutOfStock: sp.stock === 0,
				alertLevel: sp.stock === 0 ? 'critical' : 'warning',
			}));
	}

	/**
	 * Transfer stock between stores
	 */
	static async transferStock(
		fromStoreId: string,
		toStoreId: string,
		productId: string,
		quantity: number,
		adminId: string,
		notes?: string
	): Promise<{ fromStore: StoreProduct; toStore: StoreProduct }> {
		return await prisma.$transaction(async (tx) => {
			// Validate admin permission
			const admin = await tx.admin.findFirst({
				where: {
					id: adminId,
					deletedAt: null,
				},
			});

			if (!admin || !admin.isSuper) {
				throw new ApiError(
					403,
					'Only Super Admin can transfer stock between stores'
				);
			}

			// Update source store (reduce stock)
			const fromStore = await this.updateStock({
				productId,
				storeId: fromStoreId,
				quantity: -quantity,
				type: 'TRANSFER',
				notes: `Transfer OUT to store ${toStoreId}: ${notes || ''}`,
				adminId,
			});

			// Update destination store (increase stock)
			const toStore = await this.updateStock({
				productId,
				storeId: toStoreId,
				quantity: quantity,
				type: 'TRANSFER',
				notes: `Transfer IN from store ${fromStoreId}: ${notes || ''}`,
				adminId,
			});

			return { fromStore, toStore };
		});
	}

	/**
	 * Set minimum stock level for a product in a store
	 */
	static async setMinStock(
		storeId: string,
		productId: string,
		minStock: number,
		adminId: string
	): Promise<StoreProduct> {
		// Validate admin permission
		const admin = await prisma.admin.findFirst({
			where: {
				id: adminId,
				deletedAt: null,
			},
		});

		if (!admin) {
			throw new ApiError(404, 'Admin not found');
		}

		if (!admin.isSuper && admin.storeId !== storeId) {
			throw new ApiError(
				403,
				'Admin can only manage inventory for their assigned store'
			);
		}

		const storeProduct = await prisma.storeProduct.findFirst({
			where: {
				storeId,
				productId,
				deletedAt: null,
			},
		});

		if (!storeProduct) {
			throw new ApiError(404, 'Product not found in store inventory');
		}

		return await prisma.storeProduct.update({
			where: {
				storeId_productId: {
					storeId,
					productId,
				},
			},
			data: {
				minStock,
			},
		});
	}
}
