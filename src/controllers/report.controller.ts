import { Response } from 'express';
import { ReportService } from '../services/report.service';
import { catchAsync } from '../utils/catchAsync';
import { ApiError } from '../utils/ApiError';
import { AuthenticatedRequest } from '../types/express';

export class ReportController {
	private reportService = new ReportService();

	// ==================== SALES REPORTS ====================

	/**
	 * GET /reports/sales/monthly
	 * Get monthly sales summary
	 */
	getMonthlySales = catchAsync(
		async (req: AuthenticatedRequest, res: Response) => {
			const adminId = req.user?.id;
			if (!adminId) {
				throw new ApiError(401, 'Admin authentication required');
			}

			const { storeId, month, year } = req.query;

			const filters = {
				storeId: storeId as string,
				month: month ? parseInt(month as string) : undefined,
				year: year ? parseInt(year as string) : undefined,
			};

			const report = await this.reportService.getMonthlySalesReport(
				adminId,
				filters
			);

			res.status(200).json({
				success: true,
				message: 'Monthly sales report retrieved successfully',
				data: report,
			});
		}
	);

	/**
	 * GET /reports/sales/categories
	 * Get sales report by categories
	 */
	getSalesByCategories = catchAsync(
		async (req: AuthenticatedRequest, res: Response) => {
			const adminId = req.user?.id;
			if (!adminId) {
				throw new ApiError(401, 'Admin authentication required');
			}

			const { storeId, month, year } = req.query;

			const filters = {
				storeId: storeId as string,
				month: month ? parseInt(month as string) : undefined,
				year: year ? parseInt(year as string) : undefined,
			};

			const report = await this.reportService.getSalesByCategory(
				adminId,
				filters
			);

			res.status(200).json({
				success: true,
				message: 'Sales by categories report retrieved successfully',
				data: report,
			});
		}
	);

	/**
	 * GET /reports/sales/products
	 * Get sales report by products
	 */
	getSalesByProducts = catchAsync(
		async (req: AuthenticatedRequest, res: Response) => {
			const adminId = req.user?.id;
			if (!adminId) {
				throw new ApiError(401, 'Admin authentication required');
			}

			const { storeId, month, year, productId } = req.query;

			const filters = {
				storeId: storeId as string,
				productId: productId as string,
				month: month ? parseInt(month as string) : undefined,
				year: year ? parseInt(year as string) : undefined,
			};

			const report = await this.reportService.getSalesByProducts(
				adminId,
				filters
			);

			res.status(200).json({
				success: true,
				message: 'Sales by products report retrieved successfully',
				data: report,
			});
		}
	);

	// ==================== STOCK REPORTS ====================

	/**
	 * GET /reports/stock/monthly
	 * Get monthly stock movement summary
	 */
	getMonthlyStockReport = catchAsync(
		async (req: AuthenticatedRequest, res: Response) => {
			const adminId = req.user?.id;
			if (!adminId) {
				throw new ApiError(401, 'Admin authentication required');
			}

			const { storeId, month, year } = req.query;

			const filters = {
				storeId: storeId as string,
				month: month ? parseInt(month as string) : undefined,
				year: year ? parseInt(year as string) : undefined,
			};

			const report = await this.reportService.getMonthlyStockReport(
				adminId,
				filters
			);

			res.status(200).json({
				success: true,
				message: 'Monthly stock report retrieved successfully',
				data: report,
			});
		}
	);

	/**
	 * GET /reports/stock/product/:productId
	 * Get detailed stock report for specific product
	 */
	getProductStockReport = catchAsync(
		async (req: AuthenticatedRequest, res: Response) => {
			const adminId = req.user?.id;
			if (!adminId) {
				throw new ApiError(401, 'Admin authentication required');
			}

			const { productId } = req.params;
			const { storeId, month, year } = req.query;

			const filters = {
				storeId: storeId as string,
				month: month ? parseInt(month as string) : undefined,
				year: year ? parseInt(year as string) : undefined,
			};

			const report = await this.reportService.getProductStockReport(
				adminId,
				productId,
				filters
			);

			res.status(200).json({
				success: true,
				message: 'Product stock report retrieved successfully',
				data: report,
			});
		}
	);

	/**
	 * GET /reports/stock/trends
	 * Get stock movement trends over multiple months
	 */
	getStockTrends = catchAsync(
		async (req: AuthenticatedRequest, res: Response) => {
			const adminId = req.user?.id;
			if (!adminId) {
				throw new ApiError(401, 'Admin authentication required');
			}

			const { storeId, months } = req.query;

			const filters = {
				storeId: storeId as string,
				months: months ? parseInt(months as string) : 6,
			};

			const report = await this.reportService.getStockTrends(adminId, filters);

			res.status(200).json({
				success: true,
				message: 'Stock trends report retrieved successfully',
				data: report,
			});
		}
	);

	// ==================== COMBINED REPORTS ====================

	/**
	 * GET /reports/dashboard
	 * Get dashboard summary with key metrics
	 */
	getDashboardReport = catchAsync(
		async (req: AuthenticatedRequest, res: Response) => {
			const adminId = req.user?.id;
			if (!adminId) {
				throw new ApiError(401, 'Admin authentication required');
			}

			const { storeId } = req.query;

			const filters = {
				storeId: storeId as string,
			};

			// Get current month data
			const [salesReport, stockReport] = await Promise.all([
				this.reportService.getMonthlySalesReport(adminId, filters),
				this.reportService.getMonthlyStockReport(adminId, filters),
			]);

			res.status(200).json({
				success: true,
				message: 'Dashboard report retrieved successfully',
				data: {
					sales: {
						period: salesReport.period,
						summary: salesReport.summary,
						topProducts: salesReport.topProducts.slice(0, 5), // Top 5 only
						dailySales: salesReport.dailySales, // Include daily sales for graph
					},
					stock: {
						period: {
							month: stockReport.month,
							year: stockReport.year,
							startDate: '', // Could be added if needed
							endDate: '', // Could be added if needed
						},
						summary: {
							totalProducts: stockReport.totalProducts,
							lowStockCount: stockReport.lowStockProducts,
							outOfStockCount: stockReport.outOfStockProducts,
							totalStockValue: stockReport.stockValue,
						},
						lowStockAlerts: [], // This would need to be queried separately if needed
						movementsByType: stockReport.stockMovements,
					},
				},
			});
		}
	);
}
