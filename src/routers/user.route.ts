import express from "express";
import { loginUserController, registerUserController, verifyUserEmailController } from "../controllers/user.controller";
import { mainVerifyToken } from "../middlewares/jwt.middleware";
import { checkLoginUserRequest, checkRegisterUserRequest } from "../middlewares/user.middleware";

const userRouter = express.Router();

userRouter.post("/register", checkRegisterUserRequest, registerUserController);
userRouter.post("/verify-email", mainVerifyToken, verifyUserEmailController);
userRouter.post("/login", checkLoginUserRequest, loginUserController);

export default userRouter;