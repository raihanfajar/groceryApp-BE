import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { ApiError } from "../utils/ApiError";

export interface MainAuthenticatedRequest extends Request {
    payload?: JwtPayload;
}

export const mainVerifyToken = (req: MainAuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) throw new ApiError(401, "Authorization header missing");

        const token = authHeader.split(" ")[1];
        if (!token) throw new ApiError(401, "Token not provided");

        const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

        req.payload = payload; // !attach decoded payload to request
        next();
    } catch (err: any) {
        if (err.name === "TokenExpiredError") {
            return next(new ApiError(401, "Token expired"));
        }
        if (err.name === "JsonWebTokenError") {
            return next(new ApiError(401, "Invalid token"));
        }
        next(err);
    }
};
