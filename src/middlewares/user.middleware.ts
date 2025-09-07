import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
const phoneNumberRegex = /^(?:\+62|62|0)8[1-9][0-9]{6,11}$/

export const checkRegisterUserRequest = async (req: Request, res: Response, next: NextFunction) => {
    let { name, email, password, phoneNumber } = req.body;
    name = name?.trim();
    email = email?.trim();
    phoneNumber = phoneNumber?.trim();

    // !Check all required fields
    if (!name || !email || !password || !phoneNumber) throw new ApiError(400, 'name, email, password, and phone number are required');

    // !Check name
    if (name.trim().length < 3) throw new ApiError(400, 'Name must be at least 3 characters');

    // !Check email
    if (!emailRegex.test(email)) throw new ApiError(400, "Please provide a valid email address");

    // !Check password
    if (!passwordRegex.test(password)) throw new ApiError(400, "Password must be at least 6 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character");

    // !Check phone number
    if (!phoneNumberRegex.test(phoneNumber)) throw new ApiError(400, 'Please provide valid Indonesian phone number');

    next();
}

export const checkLoginUserRequest = async (req: Request, res: Response, next: NextFunction) => {
    let { email, password } = req.body;
    email = email?.trim();

    // !Check all required fields
    if (!email || !password) throw new ApiError(400, 'email and password are required');

    // !Check email
    if (!emailRegex.test(email)) throw new ApiError(400, "Please provide a valid email address");

    next();
}