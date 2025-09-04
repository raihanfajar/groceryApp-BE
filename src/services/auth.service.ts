import prisma from "../config";
import { Users } from "../generated/prisma";
import { comparePassword, hashPassword } from "../lib/bcrypt";
import { generateToken } from "../lib/jwt";
import { ApiError } from "../utils/ApiError";

export const registerUserService = async (body: Pick<Users, "name" | "email" | "password" | "phoneNumber">) => {
    const { name, email, password, phoneNumber } = body;

    // !Validation
    if (!name || !email || !password || !phoneNumber) throw new ApiError(400, 'All fields are required');
    const existingEmail = await prisma.users.findUnique({ where: { email } });
    if (existingEmail) throw new ApiError(409, 'Email already exists');

    // !Create new user
    const newUser = await prisma.users.create({
        data: {
            name,
            email,
            password: await hashPassword(password),
            phoneNumber,
            isVerified: true,
        },
    });

    // !Return
    return { status: "success", message: "User registered successfully", details: newUser };
}

export const loginUserService = async (body: Pick<Users, "email" | "password">) => {
    const { email, password } = body;

    // !Validation
    if (!email || !password) throw new ApiError(400, 'All fields are required');
    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (!existingUser) throw new ApiError(404, 'User not found');
    const isPasswordValid = await comparePassword(password, existingUser.password!);
    if (!isPasswordValid) throw new ApiError(401, 'Invalid email or password');

    // !Payload and Token signing
    const payload = { userId: existingUser.id };
    const accessToken = generateToken(payload, process.env.JWT_SECRET!, { expiresIn: "2h" });

    // !Return
    return { status: "success", message: "User logged in successfully", details: { existingUser, accessToken } };
}