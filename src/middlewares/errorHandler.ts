import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ApiError } from '../utils/ApiError';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    let statusCode = 500;
    let message = 'Internal Server Error';
    let isOperational = false;

    // If it's an ApiError, we trust it (operational error)
    if (err instanceof ApiError) {
        statusCode = err.statusCode;
        message = err.message;
        isOperational = err.isOperational;
    }

    // Prisma known errors (operational)
    // else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    //     isOperational = true;
    //     if (err.code === 'P2002') {
    //         statusCode = 409;
    //         message = `Duplicate value for field: ${err.meta?.target}`;
    //     } else if (err.code === 'P2025') {
    //         statusCode = 404;
    //         message = 'Record not found';
    //     } else {
    //         statusCode = 400;
    //         message = 'Database error';
    //     }
    // }

    // Handle validation errors (Zod/Joi) if needed
    else if (err.name === 'ZodError') {
        isOperational = true;
        statusCode = 400;
        message = err.errors.map((e: any) => e.message).join(', ');
    }

    // Log error details for developers
    console.error('ERROR 💥', err);

    res.status(statusCode).json({
        status: 'error',
        message: isOperational ? message : 'Something went wrong',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};
