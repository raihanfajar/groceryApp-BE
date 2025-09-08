import express from "express";
import { forgotPasswordUserController, loginUserController, registerUserController, resetPasswordUserController, verifyUserEmailController } from "../controllers/user.controller";
import { mainVerifyToken } from "../middlewares/jwt.middleware";
import { checkLoginUserRequest, checkRegisterUserRequest } from "../middlewares/user.middleware";

const userRouter = express.Router();

userRouter.post("/register", checkRegisterUserRequest, registerUserController);
userRouter.post("/verify-email", mainVerifyToken, verifyUserEmailController);
userRouter.post("/login", checkLoginUserRequest, loginUserController);
userRouter.post("/forgot-password", forgotPasswordUserController);
userRouter.post("/reset-password", mainVerifyToken, resetPasswordUserController)

export default userRouter;