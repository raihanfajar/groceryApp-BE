import express from "express";
import { forgotPasswordUserController, googleAuthCallbackUserController, googleAuthUserController, loginUserController, registerUserController, resendVerificationController, resetPasswordUserController, sessionLoginUserController, verifyUserEmailController } from "../controllers/user.controller";
import { mainVerifyToken } from "../middlewares/jwt.middleware";
import { checkLoginUserRequest, checkRegisterUserRequest } from "../middlewares/user.middleware";
import passport from "../config/passport";

const userRouter = express.Router();

userRouter.post("/register", checkRegisterUserRequest, registerUserController);
userRouter.post("/verify-email", mainVerifyToken, verifyUserEmailController);
userRouter.post("/login", checkLoginUserRequest, loginUserController);
userRouter.post("/resend-verification", resendVerificationController);
userRouter.post("/forgot-password", forgotPasswordUserController);
userRouter.post("/reset-password", mainVerifyToken, resetPasswordUserController);
userRouter.get("/session-login", mainVerifyToken, sessionLoginUserController);

userRouter.get(
    "/google-auth",
    passport.authenticate("google", { scope: ["email", "profile"], prompt: "select_account" }),
    googleAuthUserController);

userRouter.get(
    "/google-auth/callback",
    passport.authenticate("google", { session: false, failureRedirect: "http://localhost:3000/user-login" }),
    googleAuthCallbackUserController);

export default userRouter;