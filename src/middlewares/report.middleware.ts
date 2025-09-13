import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../types/express';
import { ApiError } from '../utils/ApiError';

/**
 * Middleware to validate report query parameters
 */
export const validateReportParams = (
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction
) => {
	const { month, year, months } = req.query;

	// Validate month parameter
	if (month) {
		const monthNum = parseInt(month as string);
		if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
			throw new ApiError(400, 'Month must be a number between 1 and 12');
		}
	}

	// Validate year parameter
	if (year) {
		const yearNum = parseInt(year as string);
		const currentYear = new Date().getFullYear();
		if (isNaN(yearNum) || yearNum < 2020 || yearNum > currentYear + 1) {
			throw new ApiError(
				400,
				`Year must be between 2020 and ${currentYear + 1}`
			);
		}
	}

	// Validate months parameter (for trends)
	if (months) {
		const monthsNum = parseInt(months as string);
		if (isNaN(monthsNum) || monthsNum < 1 || monthsNum > 24) {
			throw new ApiError(400, 'Months must be a number between 1 and 24');
		}
	}

	next();
};

/**
 * Middleware to validate store access for reports
 * Super admins can access any store, store admins are limited to their own store
 */
export const validateStoreAccess = (
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction
) => {
	const { storeId } = req.query;
	const user = req.user;

	if (!user) {
		throw new ApiError(401, 'Authentication required');
	}

	// If user is not super admin and tries to access other store's data
	if (!user.isSuper && storeId && user.storeId !== storeId) {
		throw new ApiError(
			403,
			'Access denied. You can only view reports for your assigned store'
		);
	}

	// Store admins should only see their store's data (override any storeId param)
	if (!user.isSuper && user.storeId) {
		req.query.storeId = user.storeId;
	}

	next();
};

/**
 * Middleware to validate product ID parameter
 */
export const validateProductId = (
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction
) => {
	const { productId } = req.params;

	if (!productId || typeof productId !== 'string') {
		throw new ApiError(400, 'Valid product ID is required');
	}

	// Basic UUID format validation
	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	if (!uuidRegex.test(productId)) {
		throw new ApiError(400, 'Invalid product ID format');
	}

	next();
};

/**
 * Combined validation middleware for report routes
 */
export const validateReportRequest = [
	validateReportParams,
	validateStoreAccess,
];

/**
 * Combined validation for product-specific reports
 */
export const validateProductReportRequest = [
	validateProductId,
	validateReportParams,
	validateStoreAccess,
];
