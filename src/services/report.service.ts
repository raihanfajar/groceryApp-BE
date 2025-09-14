import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { startOfMonth, endOfMonth, format, subMonths } from 'date-fns';

interface SalesReportFilters {
	storeId?: string;
	month?: number;
	year?: number;
	categoryId?: string;
	productId?: string;
}

interface StockReportFilters {
	storeId?: string;
	month?: number;
	year?: number;
	productId?: string;
}

interface ReportPeriod {
	startDate: Date;
	endDate: Date;
	period: string;
}

export class ReportService {
	// Helper method to get report period
	private getReportPeriod(month?: number, year?: number): ReportPeriod {
		const now = new Date();
		const targetDate = new Date(
			year || now.getFullYear(),
			(month || now.getMonth() + 1) - 1,
			1
		);

		return {
			startDate: startOfMonth(targetDate),
			endDate: endOfMonth(targetDate),
			period: format(targetDate, 'MMMM yyyy'),
		};
	}

	// Validate store access for admin
	private async validateStoreAccess(adminId: string, storeId?: string) {
		const admin = await prisma.admin.findUnique({
			where: { id: adminId },
			select: { isSuper: true, storeId: true },
		});

		if (!admin) {
			throw new ApiError(404, 'Admin not found');
		}

		if (!admin.isSuper && storeId && admin.storeId !== storeId) {
			throw new ApiError(
				403,
				'Access denied. You can only view reports for your assigned store'
			);
		}

		if (!admin.isSuper && !storeId) {
			// Store admin without storeId should see their own store
			return admin.storeId;
		}

		return storeId;
	}

	// ==================== SALES REPORTS ====================

	/**
	 * Get monthly sales summary
	 */
	async getMonthlySalesReport(adminId: string, filters: SalesReportFilters) {
		const validatedStoreId = await this.validateStoreAccess(
			adminId,
			filters.storeId
		);
		const { startDate, endDate, period } = this.getReportPeriod(
			filters.month,
			filters.year
		);

		// Base query conditions
		const whereConditions: any = {
			createdAt: {
				gte: startDate,
				lte: endDate,
			},
			status: {
				in: ['confirmed', 'shipped'], // Only completed transactions
			},
		};

		// Add store filter if specified
		if (validatedStoreId) {
			whereConditions.products = {
				some: {
					product: {
						storeProducts: {
							some: {
								storeId: validatedStoreId,
							},
						},
					},
				},
			};
		}

		// Get sales data
		const [totalSales, totalTransactions, topProducts, dailySales] =
			await prisma.$transaction([
				// Total sales amount
				prisma.transaction.aggregate({
					where: whereConditions,
					_sum: {
						totalPrice: true,
					},
				}),

				// Total number of transactions
				prisma.transaction.count({
					where: whereConditions,
				}),

				// Top selling products
				prisma.transactionProduct.groupBy({
					by: ['productId'],
					where: {
						transaction: whereConditions,
					},
					_sum: {
						quantity: true,
						price: true,
					},
					orderBy: {
						_sum: {
							quantity: 'desc',
						},
					},
					take: 10,
				}),

				// Daily sales breakdown
				prisma.$queryRaw`
				SELECT 
					DATE(t."createdAt") as date,
					COUNT(t.id)::integer as transaction_count,
					COALESCE(SUM(t."totalPrice"), 0)::integer as total_sales
				FROM "FreshNear"."Transaction" t
				WHERE t."createdAt" >= ${startDate}
					AND t."createdAt" <= ${endDate}
					AND t.status IN ('confirmed', 'shipped')
				GROUP BY DATE(t."createdAt")
				ORDER BY date ASC
			`,
			]);

		// Get product details for top products
		const productIds = topProducts.map((p) => p.productId);
		const productDetails = await prisma.product.findMany({
			where: { id: { in: productIds } },
			select: {
				id: true,
				name: true,
				category: {
					select: { name: true },
				},
			},
		});

		const topProductsWithDetails = topProducts.map((product) => {
			const details = productDetails.find((p) => p.id === product.productId);
			return {
				productId: product.productId,
				productName: details?.name || 'Unknown',
				categoryName: details?.category?.name || 'Unknown',
				totalQuantitySold: product._sum?.quantity || 0,
				totalRevenue: product._sum?.price || 0,
			};
		});

		return {
			period,
			summary: {
				totalSales: totalSales._sum.totalPrice || 0,
				totalTransactions,
				averageOrderValue:
					totalTransactions > 0
						? Math.round((totalSales._sum.totalPrice || 0) / totalTransactions)
						: 0,
			},
			topProducts: topProductsWithDetails,
			dailySales,
			storeFilter: validatedStoreId,
		};
	}

	/**
	 * Get sales report by product categories
	 */
	async getSalesByCategory(adminId: string, filters: SalesReportFilters) {
		const validatedStoreId = await this.validateStoreAccess(
			adminId,
			filters.storeId
		);
		const { startDate, endDate, period } = this.getReportPeriod(
			filters.month,
			filters.year
		);

		const categoryStats = await prisma.$queryRaw`
			SELECT 
				c.id as category_id,
				c.name as category_name,
				COUNT(DISTINCT t.id)::integer as transaction_count,
				COALESCE(SUM(tp.quantity), 0)::integer as total_quantity_sold,
				COALESCE(SUM(tp.price), 0)::integer as total_revenue,
				COALESCE(AVG(tp.price), 0)::decimal as average_order_value
			FROM "FreshNear"."Category" c
			LEFT JOIN "FreshNear"."Product" p ON p."categoryId" = c.id
			LEFT JOIN "FreshNear"."TransactionProduct" tp ON tp."productId" = p.id
			LEFT JOIN "FreshNear"."Transaction" t ON t.id = tp."transactionId"
			WHERE t."createdAt" >= ${startDate}
				AND t."createdAt" <= ${endDate}
				AND t.status IN ('confirmed', 'shipped')
				${
					validatedStoreId
						? prisma.$queryRaw`AND EXISTS (
					SELECT 1 FROM "FreshNear"."StoreProduct" sp 
					WHERE sp."productId" = p.id AND sp."storeId" = ${validatedStoreId}
				)`
						: prisma.$queryRaw``
				}
			GROUP BY c.id, c.name
			ORDER BY total_revenue DESC
		`;

		return {
			period,
			categories: categoryStats,
			storeFilter: validatedStoreId,
		};
	}

	/**
	 * Get detailed sales report by products
	 */
	async getSalesByProducts(adminId: string, filters: SalesReportFilters) {
		const validatedStoreId = await this.validateStoreAccess(
			adminId,
			filters.storeId
		);
		const { startDate, endDate, period } = this.getReportPeriod(
			filters.month,
			filters.year
		);

		let whereConditions: any = {
			transaction: {
				createdAt: {
					gte: startDate,
					lte: endDate,
				},
				status: {
					in: ['confirmed', 'shipped'],
				},
			},
		};

		// Add product filter if specified
		if (filters.productId) {
			whereConditions.productId = filters.productId;
		}

		// Add store filter if specified
		if (validatedStoreId) {
			whereConditions.product = {
				storeProducts: {
					some: {
						storeId: validatedStoreId,
					},
				},
			};
		}

		const productSales = await prisma.transactionProduct.groupBy({
			by: ['productId'],
			where: whereConditions,
			_sum: {
				quantity: true,
				price: true,
			},
			_count: {
				transactionId: true,
			},
			orderBy: {
				_sum: {
					price: 'desc',
				},
			},
		});

		// Get product details
		const productIds = productSales.map((p) => p.productId);
		const productDetails = await prisma.product.findMany({
			where: { id: { in: productIds } },
			include: {
				category: {
					select: { name: true },
				},
			},
		});

		// Get store product details separately if needed
		const storeProductDetails = validatedStoreId
			? await prisma.storeProduct.findMany({
					where: {
						productId: { in: productIds },
						storeId: validatedStoreId,
					},
					select: { productId: true, stock: true },
				})
			: [];

		const detailedProductSales = productSales.map((sale) => {
			const product = productDetails.find((p) => p.id === sale.productId);
			const storeProduct = storeProductDetails.find(
				(sp) => sp.productId === sale.productId
			);
			return {
				productId: sale.productId,
				productName: product?.name || 'Unknown',
				categoryName: product?.category?.name || 'Unknown',
				totalQuantitySold: sale._sum?.quantity || 0,
				totalRevenue: sale._sum?.price || 0,
				transactionCount: sale._count?.transactionId || 0,
				averageOrderValue:
					(sale._count?.transactionId || 0) > 0
						? Math.round(
								(sale._sum?.price || 0) / (sale._count?.transactionId || 1)
							)
						: 0,
				currentStock: storeProduct?.stock || 0,
				currentPrice: product?.price || 0,
			};
		});

		return {
			period,
			products: detailedProductSales,
			storeFilter: validatedStoreId,
		};
	}

	// ==================== STOCK REPORTS ====================

	/**
	 * Get monthly stock movement summary
	 */
	async getMonthlyStockReport(adminId: string, filters: StockReportFilters) {
		const validatedStoreId = await this.validateStoreAccess(
			adminId,
			filters.storeId
		);
		const { startDate, endDate, period } = this.getReportPeriod(
			filters.month,
			filters.year
		);

		let whereConditions: any = {
			createdAt: {
				gte: startDate,
				lte: endDate,
			},
		};

		if (validatedStoreId) {
			whereConditions.storeId = validatedStoreId;
		}

		// Get stock movement summary
		const [stockMovements, stockByType, lowStockProducts, totalMovements] =
			await prisma.$transaction([
				// Stock movements by product
				prisma.stockJournal.groupBy({
					by: ['productId', 'storeId'],
					where: whereConditions,
					_sum: {
						quantity: true,
					},
					_count: {
						_all: true,
					},
					orderBy: {
						_sum: {
							quantity: 'desc',
						},
					},
				}),

				// Stock movements by type
				prisma.stockJournal.groupBy({
					by: ['type'],
					where: whereConditions,
					_sum: {
						quantity: true,
					},
					_count: {
						_all: true,
					},
					orderBy: {
						type: 'asc',
					},
				}),

				// Low stock products (current stock < 10)
				prisma.storeProduct.findMany({
					where: {
						stock: { lt: 10 },
						...(validatedStoreId && { storeId: validatedStoreId }),
					},
					include: {
						product: {
							select: { name: true, category: { select: { name: true } } },
						},
						store: {
							select: { name: true },
						},
					},
					orderBy: {
						stock: 'asc',
					},
					take: 20,
				}),

				// Total movements count
				prisma.stockJournal.count({
					where: whereConditions,
				}),
			]);

		// Get product details for stock movements
		const productIds = stockMovements.map((sm) => sm.productId);
		const productDetails = await prisma.product.findMany({
			where: { id: { in: productIds } },
			select: {
				id: true,
				name: true,
				category: { select: { name: true } },
			},
		});

		const stockMovementsWithDetails = stockMovements.map((movement) => {
			const product = productDetails.find((p) => p.id === movement.productId);
			const count =
				typeof movement._count === 'object' ? movement._count._all || 0 : 0;
			return {
				productId: movement.productId,
				productName: product?.name || 'Unknown',
				categoryName: product?.category?.name || 'Unknown',
				storeId: movement.storeId,
				totalQuantityMoved: movement._sum?.quantity || 0,
				movementCount: count,
			};
		});

		return {
			period,
			summary: {
				totalMovements,
				uniqueProducts: stockMovements.length,
				totalQuantityMoved: stockMovements.reduce(
					(sum, m) => sum + (m._sum?.quantity || 0),
					0
				),
			},
			movementsByType: stockByType,
			productMovements: stockMovementsWithDetails,
			lowStockAlerts: lowStockProducts.map((sp) => ({
				productId: sp.productId,
				productName: sp.product.name,
				categoryName: sp.product.category?.name || 'Unknown',
				storeId: sp.storeId,
				storeName: sp.store.name,
				currentStock: sp.stock,
				status: sp.stock === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
			})),
			storeFilter: validatedStoreId,
		};
	}

	/**
	 * Get detailed stock report for specific product
	 */
	async getProductStockReport(
		adminId: string,
		productId: string,
		filters: StockReportFilters
	) {
		const validatedStoreId = await this.validateStoreAccess(
			adminId,
			filters.storeId
		);
		const { startDate, endDate, period } = this.getReportPeriod(
			filters.month,
			filters.year
		);

		// Verify product exists
		const product = await prisma.product.findUnique({
			where: { id: productId },
			include: {
				category: { select: { name: true } },
			},
		});

		if (!product) {
			throw new ApiError(404, 'Product not found');
		}

		let whereConditions: any = {
			productId,
			createdAt: {
				gte: startDate,
				lte: endDate,
			},
		};

		if (validatedStoreId) {
			whereConditions.storeId = validatedStoreId;
		}

		// Get detailed stock movements
		const stockMovements = await prisma.stockJournal.findMany({
			where: whereConditions,
			include: {
				admin: {
					select: { name: true },
				},
				transaction: {
					select: { id: true, status: true },
				},
			},
			orderBy: {
				createdAt: 'desc',
			},
		});

		// Get current stock levels
		const currentStock = await prisma.storeProduct.findMany({
			where: {
				productId,
				...(validatedStoreId && { storeId: validatedStoreId }),
			},
			include: {
				store: {
					select: { name: true },
				},
			},
		});

		// Calculate movement summary
		const movementSummary = stockMovements.reduce(
			(acc, movement) => {
				if (movement.type === 'IN' || movement.type === 'INITIAL') {
					acc.totalIn += movement.quantity;
				} else {
					acc.totalOut += Math.abs(movement.quantity);
				}
				return acc;
			},
			{ totalIn: 0, totalOut: 0 }
		);

		return {
			period,
			product: {
				id: product.id,
				name: product.name,
				categoryName: product.category?.name || 'Unknown',
			},
			summary: {
				...movementSummary,
				netChange: movementSummary.totalIn - movementSummary.totalOut,
				totalMovements: stockMovements.length,
			},
			currentStock: currentStock.map((cs) => ({
				storeId: cs.storeId,
				storeName: cs.store.name,
				currentStock: cs.stock,
			})),
			movements: stockMovements.map((movement) => ({
				id: movement.id,
				date: movement.createdAt,
				type: movement.type,
				quantity: movement.quantity,
				beforeStock: movement.beforeStock,
				afterStock: movement.afterStock,
				adminName: movement.admin.name,
				notes: movement.notes,
				transactionId: movement.transactionId,
				transactionStatus: movement.transaction?.status,
			})),
			storeFilter: validatedStoreId,
		};
	}

	/**
	 * Get stock movement trends (multiple months)
	 */
	async getStockTrends(
		adminId: string,
		filters: StockReportFilters & { months?: number }
	) {
		const validatedStoreId = await this.validateStoreAccess(
			adminId,
			filters.storeId
		);
		const months = filters.months || 6;

		const trends = [];
		for (let i = months - 1; i >= 0; i--) {
			const date = subMonths(new Date(), i);
			const { startDate, endDate, period } = this.getReportPeriod(
				date.getMonth() + 1,
				date.getFullYear()
			);

			let whereConditions: any = {
				createdAt: {
					gte: startDate,
					lte: endDate,
				},
			};

			if (validatedStoreId) {
				whereConditions.storeId = validatedStoreId;
			}

			const monthlyData = await prisma.stockJournal.groupBy({
				by: ['type'],
				where: whereConditions,
				_sum: {
					quantity: true,
				},
				_count: {
					id: true,
				},
			});

			trends.push({
				period,
				data: monthlyData,
			});
		}

		return {
			trends,
			storeFilter: validatedStoreId,
		};
	}
}
