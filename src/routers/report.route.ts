import express from 'express';
import { ReportController } from '../controllers/report.controller';
import { validateAdminAccess } from '../middlewares/auth.middleware';
import {
	validateReportRequest,
	validateProductReportRequest,
	validateReportParams,
} from '../middlewares/report.middleware';

const reportRouter = express.Router();
const reportController = new ReportController();

// All report routes require admin authentication
reportRouter.use(validateAdminAccess);

// ==================== SALES REPORTS ====================

// GET /reports/sales/monthly - Monthly sales summary
reportRouter.get(
	'/sales/monthly',
	validateReportRequest,
	reportController.getMonthlySales
);

// GET /reports/sales/categories - Sales by categories
reportRouter.get(
	'/sales/categories',
	validateReportRequest,
	reportController.getSalesByCategories
);

// GET /reports/sales/products - Sales by products
reportRouter.get(
	'/sales/products',
	validateReportRequest,
	reportController.getSalesByProducts
);

// ==================== STOCK REPORTS ====================

// GET /reports/stock/monthly - Monthly stock movement summary
reportRouter.get(
	'/stock/monthly',
	validateReportRequest,
	reportController.getMonthlyStockReport
);

// GET /reports/stock/product/:productId - Detailed stock report for specific product
reportRouter.get(
	'/stock/product/:productId',
	validateProductReportRequest,
	reportController.getProductStockReport
);

// GET /reports/stock/trends - Stock movement trends over multiple months
reportRouter.get(
	'/stock/trends',
	validateReportParams,
	reportController.getStockTrends
);

// ==================== DASHBOARD ====================

// GET /reports/dashboard - Dashboard summary with key metrics
reportRouter.get(
	'/dashboard',
	validateReportRequest,
	reportController.getDashboardReport
);

export default reportRouter;
