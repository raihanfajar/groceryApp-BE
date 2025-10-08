import { Request, Response } from "express";
import { MainAuthenticatedRequest } from "../middlewares/jwt.middleware";
import { changePasswordUserService, forgotPasswordUserService, googleAuthCallbackUserService, loginUserService, registerUserService, resendVerificationService, resetPasswordUserService, sessionLoginUserService, updateUserProfileInfoService, uploadAvatarService, verifyUserEmailService } from "../services/user.service";
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

export const changePasswordUserController = catchAsync(async (req: MainAuthenticatedRequest, res: Response) => {
    await changePasswordUserService(req.payload!.userId, req.body.currentPassword, req.body.newPassword);
    res.status(200).json({ status: "success", message: "Password changed" });
})

export const sessionLoginUserController = catchAsync(async (req: MainAuthenticatedRequest, res: Response) => {
    const result = await sessionLoginUserService(req.payload!.userId);
    res.status(200).json({ status: "success", message: "User login successful", data: result });
});

export const updateUserProfileInfoController = catchAsync(async (req: MainAuthenticatedRequest, res: Response) => {
    const result = await updateUserProfileInfoService(req.payload!.userId, req.body);
    const message = result.emailChanged
        ? "User info updated successfully. Please verify your new email first."
        : "User info updated successfully.";
    res.status(200).json({ status: "success", message, data: result.user, emailChanged: result.emailChanged });
})

// !UPLOAD AVATAR HERE BRO
export const uploadAvatarController = catchAsync(async (req: MainAuthenticatedRequest, res: Response) => {
    const newUrl = await uploadAvatarService(req.payload!.userId, req.file!);
    res.status(200).json({ status: "success", message: "Avatar uploaded successfully", data: newUrl });
})

export const googleAuthUserController = catchAsync(async (_req, _res) => {
    // i suppose this is no need yea? because masuk kesini aja nggak
});

export const googleAuthCallbackUserController = catchAsync(async (req, res) => {
    const googleProfile = req.user;
    const result = await googleAuthCallbackUserService(googleProfile);

    // Redirect back to FE with token
    const baseUrl = process.env.NODE_ENV === 'production'
        ? 'https://freshnear.store'
        : 'http://localhost:3000';

    res.redirect(
        `${baseUrl}/login-success?token=${result.accessToken}&id=${result.id}&name=${encodeURIComponent(result.name)}&email=${encodeURIComponent(result.email)}`
    );
});