import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError';

interface JWTPayload {
	id: string;
	email: string;
	isSuper: boolean;
	storeId?: string;
	role: string;
}

interface AuthenticatedRequest extends Request {
	user?: JWTPayload;
}

export const verifyToken = async (
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction
) => {
	try {
		const token = req.headers.authorization?.split(' ')[1];

		if (!token) {
			throw new ApiError(401, 'Token not provided!');
		}

		const payload = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

		if (!payload) {
			throw new ApiError(401, 'Invalid token!');
		}

		req.user = payload;
		next();
	} catch (error) {
		if (error instanceof jwt.JsonWebTokenError) {
			throw new ApiError(401, 'Invalid token!');
		}
		next(error);
	}
};

export const verifyAdminRole = (
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction
) => {
	if (!req.user || req.user.role !== 'admin') {
		throw new ApiError(403, 'Admin access required!');
	}

	next();
};

export const verifySuperAdmin = (
	req: AuthenticatedRequest,
	res: Response,
	next: NextFunction
) => {
	if (!req.user || req.user.role !== 'admin' || !req.user.isSuper) {
		throw new ApiError(403, 'Super admin access required!');
	}

	next();
};
