import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError";

export const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        throw new ApiError(401, "Token not provided!");
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET!);

    if (!payload) {
        throw new ApiError(401, "Invalid token!");
    }

    res.locals.payload = payload;
    next();
}

export const verifyRole = (roles: string | string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const userRole = res.locals.payload.role;

        if (!userRole) {
            throw new ApiError(403, "Unauthorized access!");
        }

        const allowedRoles = Array.isArray(roles) ? roles : [roles];
        
        if (!allowedRoles.includes(userRole)) {
            throw new ApiError(403, "Forbidden: You do not have the required role!");
        }

        next();
    }
}

export const verifyAdminRole = (req: Request, res: Response, next: NextFunction) => {
    const { role } = res.locals.payload;

    if (role !== 'admin') {
        throw new ApiError(403, "Admin access required!");
    }

    next();
}

export const verifySuperAdmin = (req: Request, res: Response, next: NextFunction) => {
    const { role, isSuper } = res.locals.payload;

    if (role !== 'admin' || !isSuper) {
        throw new ApiError(403, "Super admin access required!");
    }

    next();
}