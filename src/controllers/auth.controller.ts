import { Request, Response } from "express";
import { registerUserService } from "../services/auth.service";
import { validateRegisterUser } from "../services/functions/authValidation";

export const registerUserController = async (req: Request, res: Response) => {
    const result = await registerUserService(req.body);
    res.status(200).json(result);
};