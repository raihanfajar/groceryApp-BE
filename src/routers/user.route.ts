import express from "express";
import { changePasswordUserController, forgotPasswordUserController, googleAuthCallbackUserController, googleAuthUserController, loginUserController, registerUserController, resendVerificationController, resetPasswordUserController, sessionLoginUserController, updateUserProfileInfoController, uploadAvatarController, verifyUserEmailController } from "../controllers/user.controller";
import { mainVerifyToken } from "../middlewares/jwt.middleware";
import { checkLoginUserRequest, checkRegisterUserRequest } from "../middlewares/user.middleware";
import passport from "../config/passport";
import { uploadAvatar } from "../middlewares/avatar.upload";

const userRouter = express.Router();

userRouter.post("/register", checkRegisterUserRequest, registerUserController);
userRouter.post("/verify-email", mainVerifyToken, verifyUserEmailController);
userRouter.post("/login", checkLoginUserRequest, loginUserController);
userRouter.post("/resend-verification", resendVerificationController);
userRouter.post("/forgot-password", forgotPasswordUserController);
userRouter.post("/reset-password", mainVerifyToken, resetPasswordUserController);
userRouter.patch("/change-password", mainVerifyToken, changePasswordUserController);
userRouter.get("/session-login", mainVerifyToken, sessionLoginUserController);
userRouter.patch("/update-user-profile-info", mainVerifyToken, updateUserProfileInfoController);
userRouter.patch("/avatar", mainVerifyToken, uploadAvatar, uploadAvatarController); //! UPLOAD AVATAR ROUTE

userRouter.get(
    "/google-auth",
    passport.authenticate("google", { scope: ["email", "profile"], prompt: "select_account" }),
    googleAuthUserController);

userRouter.get(
    "/google-auth/callback",
    passport.authenticate("google", {
        session: false,
        failureRedirect: process.env.NODE_ENV === 'production'
            ? "https://freshnear.store/user-login"
            : "http://localhost:3000/user-login"
    }),
    googleAuthCallbackUserController);

export default userRouter;