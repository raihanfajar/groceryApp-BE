import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

export const validateCreateStoreAdmin = (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	const { name, email, password } = req.body;

	if (!name || typeof name !== 'string' || name.trim().length < 2) {
		throw new ApiError(
			400,
			'Name is required and must be at least 2 characters'
		);
	}

	if (!email || typeof email !== 'string' || !isValidEmail(email)) {
		throw new ApiError(400, 'Valid email is required');
	}

	if (!password || typeof password !== 'string' || password.length < 6) {
		throw new ApiError(
			400,
			'Password is required and must be at least 6 characters'
		);
	}

	next();
};

export const validateUpdateStoreAdmin = (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	const { name, email, password } = req.body;

	if (
		name !== undefined &&
		(typeof name !== 'string' || name.trim().length < 2)
	) {
		throw new ApiError(400, 'Name must be at least 2 characters');
	}

	if (
		email !== undefined &&
		(typeof email !== 'string' || !isValidEmail(email))
	) {
		throw new ApiError(400, 'Valid email is required');
	}

	if (
		password !== undefined &&
		(typeof password !== 'string' || password.length < 6)
	) {
		throw new ApiError(400, 'Password must be at least 6 characters');
	}

	next();
};

export const validateAdminLogin = (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	const { email, password } = req.body;

	if (!email || typeof email !== 'string' || !isValidEmail(email)) {
		throw new ApiError(400, 'Valid email is required');
	}

	if (!password || typeof password !== 'string') {
		throw new ApiError(400, 'Password is required');
	}

	next();
};

// Helper function to validate email format
const isValidEmail = (email: string): boolean => {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
};
