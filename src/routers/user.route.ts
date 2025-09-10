import express from "express";
import { forgotPasswordUserController, loginUserController, registerUserController, resetPasswordUserController, verifyUserEmailController } from "../controllers/user.controller";
import { mainVerifyToken } from "../middlewares/jwt.middleware";
import { checkLoginUserRequest, checkRegisterUserRequest } from "../middlewares/user.middleware";

const userRouter = express.Router();

userRouter.post("/register", checkRegisterUserRequest, registerUserController);
userRouter.post("/verify-email", mainVerifyToken, verifyUserEmailController);
userRouter.post("/login", checkLoginUserRequest, loginUserController);
userRouter.post("/forgot-password", forgotPasswordUserController);
userRouter.post("/reset-password", mainVerifyToken, resetPasswordUserController);
userRouter.get("/session-login", mainVerifyToken);

// userRouter.get(
//     "/google-auth",
//     passport.authenticate("google", { scope: ["email", "profile"] }),
//     googleAuthUserController); // !still consulting with the genius ChatGPT

// userRouter.get(
//     "/google-auth/callback",
//     passport.authenticate("google", { session: false, failureRedirect: "http://localhost:3000/user-login" }),
//     googleAuthCallbackUserController); // !still consulting with the genius ChatGPT

export default userRouter;