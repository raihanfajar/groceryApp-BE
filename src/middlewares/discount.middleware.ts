import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { DiscountType, DiscountValueType } from '../generated/prisma';

export class DiscountMiddleware {
	static validateCreateDiscount = (
		req: Request,
		res: Response,
		next: NextFunction
	) => {
		const {
			name,
			type,
			valueType,
			value,
			startDate,
			endDate,
			productIds,
			buyQuantity,
			getQuantity,
		} = req.body;

		// Validate required fields
		if (!name || typeof name !== 'string' || name.trim().length === 0) {
			throw new ApiError(
				400,
				'Name is required and must be a non-empty string'
			);
		}

		if (!type || !Object.values(DiscountType).includes(type)) {
			throw new ApiError(400, 'Valid discount type is required');
		}

		// For BOGO discounts, value and valueType are not required
		if (type !== DiscountType.BOGO) {
			if (!valueType || !Object.values(DiscountValueType).includes(valueType)) {
				throw new ApiError(400, 'Valid discount value type is required');
			}

			if (
				value === undefined ||
				value === null ||
				typeof value !== 'number' ||
				value <= 0
			) {
				throw new ApiError(400, 'Value must be a positive number');
			}

			// Validate percentage bounds
			if (
				valueType === DiscountValueType.PERCENTAGE &&
				(value < 1 || value > 100)
			) {
				throw new ApiError(
					400,
					'Percentage discount must be between 1 and 100'
				);
			}
		}

		// Validate dates
		if (!startDate || !endDate) {
			throw new ApiError(400, 'Start date and end date are required');
		}

		const startDateObj = new Date(startDate);
		const endDateObj = new Date(endDate);

		if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
			throw new ApiError(400, 'Invalid date format');
		}

		if (startDateObj >= endDateObj) {
			throw new ApiError(400, 'Start date must be before end date');
		}

		// Validate product IDs
		if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
			throw new ApiError(400, 'At least one product ID is required');
		}

		for (const productId of productIds) {
			if (!productId || typeof productId !== 'string') {
				throw new ApiError(400, 'All product IDs must be valid strings');
			}
		}

		// Validate BOGO specific fields
		if (type === DiscountType.BOGO) {
			if (
				!buyQuantity ||
				!getQuantity ||
				typeof buyQuantity !== 'number' ||
				typeof getQuantity !== 'number'
			) {
				throw new ApiError(
					400,
					'BOGO discount requires valid buyQuantity and getQuantity'
				);
			}

			if (buyQuantity <= 0 || getQuantity <= 0) {
				throw new ApiError(400, 'BOGO quantities must be greater than 0');
			}
		}

		// Validate optional numeric fields
		const numericFields = [
			'maxDiscountAmount',
			'minTransactionValue',
			'maxUsagePerCustomer',
			'totalUsageLimit',
			'maxBogoSets',
		];

		for (const field of numericFields) {
			const value = req.body[field];
			if (
				value !== undefined &&
				value !== null &&
				(typeof value !== 'number' || value < 0)
			) {
				throw new ApiError(400, `${field} must be a non-negative number`);
			}
		}

		next();
	};

	static validateUpdateDiscount = (
		req: Request,
		res: Response,
		next: NextFunction
	) => {
		const {
			name,
			value,
			startDate,
			endDate,
			productIds,
			buyQuantity,
			getQuantity,
		} = req.body;

		// Validate name if provided
		if (
			name !== undefined &&
			(typeof name !== 'string' || name.trim().length === 0)
		) {
			throw new ApiError(400, 'Name must be a non-empty string');
		}

		// Validate value if provided
		if (value !== undefined && (typeof value !== 'number' || value <= 0)) {
			throw new ApiError(400, 'Value must be a positive number');
		}

		// Validate dates if provided
		if (startDate !== undefined || endDate !== undefined) {
			if (startDate) {
				const startDateObj = new Date(startDate);
				if (isNaN(startDateObj.getTime())) {
					throw new ApiError(400, 'Invalid start date format');
				}
			}

			if (endDate) {
				const endDateObj = new Date(endDate);
				if (isNaN(endDateObj.getTime())) {
					throw new ApiError(400, 'Invalid end date format');
				}
			}

			if (startDate && endDate) {
				const startDateObj = new Date(startDate);
				const endDateObj = new Date(endDate);
				if (startDateObj >= endDateObj) {
					throw new ApiError(400, 'Start date must be before end date');
				}
			}
		}

		// Validate product IDs if provided
		if (productIds !== undefined) {
			if (!Array.isArray(productIds) || productIds.length === 0) {
				throw new ApiError(400, 'Product IDs must be a non-empty array');
			}

			for (const productId of productIds) {
				if (!productId || typeof productId !== 'string') {
					throw new ApiError(400, 'All product IDs must be valid strings');
				}
			}
		}

		// Validate BOGO quantities if provided
		if (
			buyQuantity !== undefined &&
			(typeof buyQuantity !== 'number' || buyQuantity <= 0)
		) {
			throw new ApiError(400, 'Buy quantity must be a positive number');
		}

		if (
			getQuantity !== undefined &&
			(typeof getQuantity !== 'number' || getQuantity <= 0)
		) {
			throw new ApiError(400, 'Get quantity must be a positive number');
		}

		// Validate optional numeric fields
		const numericFields = [
			'maxDiscountAmount',
			'minTransactionValue',
			'maxUsagePerCustomer',
			'totalUsageLimit',
			'maxBogoSets',
		];

		for (const field of numericFields) {
			const value = req.body[field];
			if (
				value !== undefined &&
				value !== null &&
				(typeof value !== 'number' || value < 0)
			) {
				throw new ApiError(400, `${field} must be a non-negative number`);
			}
		}

		next();
	};

	static validateApplyDiscount = (
		req: Request,
		res: Response,
		next: NextFunction
	) => {
		const { discountId, orderTotal } = req.body;

		if (!discountId || typeof discountId !== 'string') {
			throw new ApiError(400, 'Valid discount ID is required');
		}

		if (!orderTotal || typeof orderTotal !== 'number' || orderTotal <= 0) {
			throw new ApiError(400, 'Order total must be a positive number');
		}

		// Validate optional fields
		const { transactionId, userId } = req.body;

		if (transactionId !== undefined && typeof transactionId !== 'string') {
			throw new ApiError(400, 'Transaction ID must be a string');
		}

		if (userId !== undefined && typeof userId !== 'string') {
			throw new ApiError(400, 'User ID must be a string');
		}

		next();
	};

	static validateGetAvailableDiscounts = (
		req: Request,
		res: Response,
		next: NextFunction
	) => {
		const { storeId, orderTotal, productIds } = req.query;

		if (!storeId || typeof storeId !== 'string') {
			throw new ApiError(400, 'Valid store ID is required');
		}

		if (!orderTotal || isNaN(Number(orderTotal)) || Number(orderTotal) <= 0) {
			throw new ApiError(400, 'Order total must be a positive number');
		}

		if (!productIds) {
			throw new ApiError(400, 'Product IDs are required');
		}

		// Validate product IDs format
		const productIdArray = Array.isArray(productIds)
			? (productIds as string[])
			: (productIds as string).split(',');

		if (productIdArray.length === 0) {
			throw new ApiError(400, 'At least one product ID is required');
		}

		for (const productId of productIdArray) {
			if (!productId || typeof productId !== 'string') {
				throw new ApiError(400, 'All product IDs must be valid strings');
			}
		}

		next();
	};

	static validateQueryParams = (
		req: Request,
		res: Response,
		next: NextFunction
	) => {
		const { page, limit, dateFrom, dateTo } = req.query;

		// Validate pagination parameters
		if (page !== undefined) {
			const pageNum = Number(page);
			if (isNaN(pageNum) || pageNum < 1) {
				throw new ApiError(400, 'Page must be a positive number');
			}
		}

		if (limit !== undefined) {
			const limitNum = Number(limit);
			if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
				throw new ApiError(400, 'Limit must be between 1 and 100');
			}
		}

		// Validate date parameters
		if (dateFrom) {
			const date = new Date(dateFrom as string);
			if (isNaN(date.getTime())) {
				throw new ApiError(400, 'Invalid dateFrom format');
			}
		}

		if (dateTo) {
			const date = new Date(dateTo as string);
			if (isNaN(date.getTime())) {
				throw new ApiError(400, 'Invalid dateTo format');
			}
		}

		if (dateFrom && dateTo) {
			const fromDate = new Date(dateFrom as string);
			const toDate = new Date(dateTo as string);
			if (fromDate >= toDate) {
				throw new ApiError(400, 'dateFrom must be before dateTo');
			}
		}

		next();
	};
}
