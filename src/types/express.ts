import { Request } from 'express';

// JWT Payload interface
export interface JWTPayload {
	id: string;
	email: string;
	isSuper: boolean;
	storeId?: string;
	role: string;
}

// Extend Express Request interface globally
declare global {
	namespace Express {
		interface Request {
			user?: JWTPayload;
		}
	}
}

// AuthenticatedRequest type alias for better readability
export type AuthenticatedRequest = Request & {
	user?: JWTPayload;
};

// Export commonly used types
export { Request, Response, NextFunction } from 'express';
