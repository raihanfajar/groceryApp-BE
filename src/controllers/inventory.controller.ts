import { Request, Response, NextFunction } from 'express';
import {
	InventoryService,
	StockUpdateInput,
	BulkStockUpdateInput,
} from '../services/inventory.service';
import { ApiError } from '../utils/ApiError';
import { catchAsync } from '../utils/catchAsync';
import { StockMovement } from '../generated/prisma';
import { AuthenticatedRequest } from '../types/express';

export class InventoryController {
	/**
	 * POST /admin/inventory/stock/update
	 * Update stock for a single product
	 */
	static updateStock = catchAsync(
		async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
			const { productId, storeId, quantity, type, notes } = req.body;
			const adminId = req.user!.id;

			// Validate input
			if (!productId || !quantity || !type) {
				throw new ApiError(400, 'Product ID, quantity, and type are required');
			}

			if (!Object.values(StockMovement).includes(type)) {
				throw new ApiError(400, 'Invalid stock movement type');
			}

			if (quantity <= 0) {
				throw new ApiError(400, 'Quantity must be greater than 0');
			}

			// For store admins, use their assigned store
			let targetStoreId = storeId;
			if (!req.user!.isSuper) {
				if (!req.user!.storeId) {
					throw new ApiError(403, 'Store admin must be assigned to a store');
				}
				targetStoreId = req.user!.storeId;
			}

			if (!targetStoreId) {
				throw new ApiError(400, 'Store ID is required');
			}

			const updateData: StockUpdateInput = {
				productId,
				storeId: targetStoreId,
				quantity,
				type,
				notes,
				adminId,
			};

			const result = await InventoryService.updateStock(updateData);

			res.status(200).json({
				status: 'success',
				message: 'Stock updated successfully',
				data: result,
			});
		}
	);

	/**
	 * POST /admin/inventory/stock/bulk-update
	 * Bulk update stock for multiple products
	 */
	static bulkUpdateStock = catchAsync(
		async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
			const { storeId, items } = req.body;
			const adminId = req.user!.id;

			// Validate input
			if (!items || !Array.isArray(items) || items.length === 0) {
				throw new ApiError(400, 'Items array is required');
			}

			// For store admins, use their assigned store
			let targetStoreId = storeId;
			if (!req.user!.isSuper) {
				if (!req.user!.storeId) {
					throw new ApiError(403, 'Store admin must be assigned to a store');
				}
				targetStoreId = req.user!.storeId;
			}

			if (!targetStoreId) {
				throw new ApiError(400, 'Store ID is required');
			}

			// Validate each item
			for (const item of items) {
				if (!item.productId || !item.quantity || !item.type) {
					throw new ApiError(
						400,
						'Each item must have productId, quantity, and type'
					);
				}
				if (!Object.values(StockMovement).includes(item.type)) {
					throw new ApiError(400, `Invalid stock movement type: ${item.type}`);
				}
				if (item.quantity <= 0) {
					throw new ApiError(400, 'Quantity must be greater than 0');
				}
			}

			const updateData: BulkStockUpdateInput = {
				storeId: targetStoreId,
				adminId,
				items,
			};

			const results = await InventoryService.bulkUpdateStock(updateData);

			res.status(200).json({
				status: 'success',
				message: `${results.length} products updated successfully`,
				data: results,
			});
		}
	);

	/**
	 * GET /admin/inventory/journal
	 * Get stock journal with filters
	 */
	static getStockJournal = catchAsync(
		async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
			const {
				storeId,
				productId,
				adminId,
				type,
				dateFrom,
				dateTo,
				page = 1,
				limit = 20,
			} = req.query;

			// Build filters
			const filters: any = {};
			if (productId) filters.productId = productId as string;
			if (adminId) filters.adminId = adminId as string;
			if (type) filters.type = type as StockMovement;
			if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
			if (dateTo) filters.dateTo = new Date(dateTo as string);

			// For store admins, only show their store's journal
			if (!req.user!.isSuper) {
				if (!req.user!.storeId) {
					throw new ApiError(403, 'Store admin must be assigned to a store');
				}
				filters.storeId = req.user!.storeId;
			} else if (storeId) {
				filters.storeId = storeId as string;
			}

			const result = await InventoryService.getStockJournal(
				filters,
				parseInt(page as string),
				parseInt(limit as string)
			);

			res.status(200).json({
				status: 'success',
				data: result,
			});
		}
	);

	/**
	 * GET /admin/inventory/summary
	 * Get inventory summary for a store
	 */
	static getInventorySummary = catchAsync(
		async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
			const { storeId } = req.query;

			// For store admins, use their assigned store
			let targetStoreId: string;
			if (!req.user!.isSuper) {
				if (!req.user!.storeId) {
					throw new ApiError(403, 'Store admin must be assigned to a store');
				}
				targetStoreId = req.user!.storeId;
			} else {
				// Super Admin must provide storeId
				if (!storeId) {
					throw new ApiError(400, 'Store ID is required for Super Admin');
				}
				targetStoreId = storeId as string;
			}

			const summary = await InventoryService.getInventorySummary(targetStoreId);

			res.status(200).json({
				status: 'success',
				data: summary,
			});
		}
	);

	/**
	 * GET /admin/inventory/low-stock
	 * Get low stock alerts for a store
	 */
	static getLowStockAlerts = catchAsync(
		async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
			const { storeId } = req.query;

			// For store admins, use their assigned store
			let targetStoreId: string | undefined;
			if (!req.user!.isSuper) {
				if (!req.user!.storeId) {
					throw new ApiError(403, 'Store admin must be assigned to a store');
				}
				targetStoreId = req.user!.storeId;
			} else {
				// Super Admin can provide storeId or omit it for all stores
				targetStoreId = storeId as string | undefined;
			}

			const alerts = await InventoryService.getLowStockAlerts(targetStoreId);

			res.status(200).json({
				status: 'success',
				data: alerts,
			});
		}
	);

	/**
	 * POST /admin/inventory/transfer
	 * Transfer stock between stores (Super Admin only)
	 */
	static transferStock = catchAsync(
		async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
			if (!req.user!.isSuper) {
				throw new ApiError(
					403,
					'Only Super Admin can transfer stock between stores'
				);
			}

			const { fromStoreId, toStoreId, productId, quantity, notes } = req.body;
			const adminId = req.user!.id;

			// Validate input
			if (!fromStoreId || !toStoreId || !productId || !quantity) {
				throw new ApiError(
					400,
					'From store, to store, product ID, and quantity are required'
				);
			}

			if (fromStoreId === toStoreId) {
				throw new ApiError(
					400,
					'Source and destination stores must be different'
				);
			}

			if (quantity <= 0) {
				throw new ApiError(400, 'Quantity must be greater than 0');
			}

			const result = await InventoryService.transferStock(
				fromStoreId,
				toStoreId,
				productId,
				quantity,
				adminId,
				notes
			);

			res.status(200).json({
				status: 'success',
				message: 'Stock transferred successfully',
				data: result,
			});
		}
	);

	/**
	 * PUT /admin/inventory/min-stock
	 * Set minimum stock level for a product
	 */
	static setMinStock = catchAsync(
		async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
			const { productId, storeId, minStock } = req.body;
			const adminId = req.user!.id;

			// Validate input
			if (!productId || minStock === undefined) {
				throw new ApiError(400, 'Product ID and minimum stock are required');
			}

			if (minStock < 0) {
				throw new ApiError(400, 'Minimum stock cannot be negative');
			}

			// For store admins, use their assigned store
			let targetStoreId = storeId;
			if (!req.user!.isSuper) {
				if (!req.user!.storeId) {
					throw new ApiError(403, 'Store admin must be assigned to a store');
				}
				targetStoreId = req.user!.storeId;
			}

			if (!targetStoreId) {
				throw new ApiError(400, 'Store ID is required');
			}

			const result = await InventoryService.setMinStock(
				targetStoreId,
				productId,
				minStock,
				adminId
			);

			res.status(200).json({
				status: 'success',
				message: 'Minimum stock level updated successfully',
				data: result,
			});
		}
	);
}
