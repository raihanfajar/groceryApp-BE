import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { StockMovement } from '../generated/prisma';

export const validateStockUpdate = (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	const { productId, quantity, type, storeId } = req.body;

	// Validate required fields
	if (!productId) {
		throw new ApiError(400, 'Product ID is required');
	}

	if (!quantity || quantity <= 0) {
		throw new ApiError(400, 'Valid quantity is required');
	}

	if (!type) {
		throw new ApiError(400, 'Stock movement type is required');
	}

	// Validate stock movement type
	if (!Object.values(StockMovement).includes(type)) {
		throw new ApiError(
			400,
			`Invalid stock movement type. Allowed values: ${Object.values(StockMovement).join(', ')}`
		);
	}

	next();
};

export const validateBulkStockUpdate = (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	const { items } = req.body;

	if (!items || !Array.isArray(items)) {
		throw new ApiError(400, 'Items array is required');
	}

	if (items.length === 0) {
		throw new ApiError(400, 'At least one item is required');
	}

	if (items.length > 100) {
		throw new ApiError(400, 'Maximum 100 items allowed per bulk update');
	}

	// Validate each item
	for (let i = 0; i < items.length; i++) {
		const item = items[i];

		if (!item.productId) {
			throw new ApiError(400, `Item ${i + 1}: Product ID is required`);
		}

		if (!item.quantity || item.quantity <= 0) {
			throw new ApiError(400, `Item ${i + 1}: Valid quantity is required`);
		}

		if (!item.type) {
			throw new ApiError(400, `Item ${i + 1}: Stock movement type is required`);
		}

		if (!Object.values(StockMovement).includes(item.type)) {
			throw new ApiError(400, `Item ${i + 1}: Invalid stock movement type`);
		}
	}

	next();
};

export const validateStockTransfer = (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	const { fromStoreId, toStoreId, productId, quantity } = req.body;

	if (!fromStoreId) {
		throw new ApiError(400, 'Source store ID is required');
	}

	if (!toStoreId) {
		throw new ApiError(400, 'Destination store ID is required');
	}

	if (!productId) {
		throw new ApiError(400, 'Product ID is required');
	}

	if (!quantity || quantity <= 0) {
		throw new ApiError(400, 'Valid quantity is required');
	}

	if (fromStoreId === toStoreId) {
		throw new ApiError(400, 'Source and destination stores must be different');
	}

	next();
};

export const validateMinStockUpdate = (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	const { productId, minStock } = req.body;

	if (!productId) {
		throw new ApiError(400, 'Product ID is required');
	}

	if (minStock === undefined || minStock < 0) {
		throw new ApiError(
			400,
			'Valid minimum stock value is required (must be >= 0)'
		);
	}

	next();
};
