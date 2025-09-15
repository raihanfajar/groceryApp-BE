import { Request, Response } from "express";
import { MainAuthenticatedRequest } from "../middlewares/jwt.middleware";
import { forgotPasswordUserService, googleAuthCallbackUserService, loginUserService, registerUserService, resendVerificationService, resetPasswordUserService, sessionLoginUserService, verifyUserEmailService } from "../services/user.service";
import { catchAsync } from "../utils/catchAsync";

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

export const resendVerificationController = catchAsync(async (req: Request, res: Response) => {
    await resendVerificationService(req.body.email);
    res.status(200).json({ status: "success", message: "Verification email sent successfully" });
})

export const forgotPasswordUserController = catchAsync(async (req: Request, res: Response) => {
    await forgotPasswordUserService(req.body);
    res.status(200).json({ status: "success", message: "Password reset email sent successfully" });
});

export const resetPasswordUserController = catchAsync(async (req: MainAuthenticatedRequest, res: Response) => {
    await resetPasswordUserService(req.payload!.userId, req.body.newPassword);
    res.status(200).json({ status: "success", message: "Password reset successful" });
});

export const sessionLoginUserController = catchAsync(async (req: MainAuthenticatedRequest, res: Response) => {
    const result = await sessionLoginUserService(req.payload!.userId);
    res.status(200).json({ status: "success", message: "User login successful", data: result });
});

export const googleAuthUserController = catchAsync(async (_req, _res) => {
    // mau apa ini
});

export const googleAuthCallbackUserController = catchAsync(async (req, res) => {
    const googleProfile = req.user;
    const result = await googleAuthCallbackUserService(googleProfile);

    // Redirect back to FE with token
    res.redirect(
        `http://localhost:3000/login-success?token=${result.accessToken}&id=${result.id}&name=${encodeURIComponent(result.name)}&email=${encodeURIComponent(result.email)}`
    );
});