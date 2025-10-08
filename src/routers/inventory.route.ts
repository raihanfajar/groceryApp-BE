import express from 'express';
import { InventoryController } from '../controllers/inventory.controller';
import { verifyToken, verifyAdminRole } from '../middlewares/auth.middleware';
import {
	validateStockUpdate,
	validateBulkStockUpdate,
	validateStockTransfer,
	validateMinStockUpdate,
} from '../middlewares/inventory.middleware';

const inventoryRouter = express.Router();

// All inventory routes require admin authentication
inventoryRouter.use(verifyToken);
inventoryRouter.use(verifyAdminRole);

// Stock management
inventoryRouter.post(
	'/stock/update',
	validateStockUpdate,
	InventoryController.updateStock
);
inventoryRouter.post(
	'/stock/bulk-update',
	validateBulkStockUpdate,
	InventoryController.bulkUpdateStock
);

// Stock transfer (Super Admin only)
inventoryRouter.post(
	'/transfer',
	validateStockTransfer,
	InventoryController.transferStock
);

// Minimum stock management
inventoryRouter.put(
	'/min-stock',
	validateMinStockUpdate,
	InventoryController.setMinStock
);

// Reports and monitoring
inventoryRouter.get('/journal', InventoryController.getStockJournal);
inventoryRouter.get('/summary', InventoryController.getInventorySummary);
inventoryRouter.get('/low-stock', InventoryController.getLowStockAlerts);
inventoryRouter.get(
	'/category-distribution',
	InventoryController.getCategoryDistribution
);
inventoryRouter.get(
	'/stock-value',
	InventoryController.getStockValueByCategory
);

export default inventoryRouter;
