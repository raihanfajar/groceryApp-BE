import { Request, Response } from "express";
import { forgotPasswordUserService, loginUserService, registerUserService, resetPasswordUserService, verifyUserEmailService } from "../services/user.service";
import { catchAsync } from "../utils/catchAsync";
import { MainAuthenticatedRequest } from "../middlewares/jwt.middleware";

export const registerUserController = catchAsync(async (req: Request, res: Response) => {
    const result = await registerUserService(req.body);
    res.status(201).json({ status: "success", message: "User registration successful", data: result });
});

export const verifyUserEmailController = catchAsync(async (req: MainAuthenticatedRequest, res: Response) => {
    await verifyUserEmailService(req.payload!.userId);
    res.status(200).json({ status: "success", message: "Email verification successful" });
})

export const loginUserController = catchAsync(async (req: Request, res: Response) => {
    const result = await loginUserService(req.body);
    res.status(200).json({ status: "success", message: "User login successful", data: result });
});

export const forgotPasswordUserController = catchAsync(async (req: Request, res: Response) => {
    await forgotPasswordUserService(req.body);
    res.status(200).json({ status: "success", message: "Password reset email sent successfully" });
});

export const resetPasswordUserController = catchAsync(async (req: MainAuthenticatedRequest, res: Response) => {
    await resetPasswordUserService(req.payload!.userId, req.body.newPassword);
    res.status(200).json({ status: "success", message: "Password reset successful" });
});