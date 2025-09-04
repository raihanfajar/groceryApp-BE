import express from "express";
import { registerUserController } from "../controllers/auth.controller";

const authRouter = express.Router();

authRouter.post("/register-user", registerUserController);

export default authRouter;