import prisma from "../config";
import { mailing } from "../functions/mailing";
import { Users } from "../generated/prisma";
import { comparePassword, hashPassword } from "../lib/bcrypt";
import { generateToken } from "../lib/jwt";
import { getTemplateUser } from "../lib/nodemailer";
import { ApiError } from "../utils/ApiError";
import CloudinaryService from "../utils/cloudinary";

import { Resend } from "resend"; //!new

const resend = new Resend(process.env.RESEND_API_KEY); //!new
const FROM_EMAIL = "FreshNear <no-reply@freshnear.store>"; //!new

export const registerUserService = async (body: Pick<Users, "name" | "email" | "password" | "phoneNumber">) => {
    const { name, email, password, phoneNumber } = body;

    // !Extra validation
    const existingEmail = await prisma.users.findUnique({ where: { email } });
    if (existingEmail) throw new ApiError(409, 'Email already exists');
    const existingPhoneNumber = await prisma.users.findUnique({ where: { phoneNumber: phoneNumber! } });
    if (existingPhoneNumber) throw new ApiError(409, 'Phone number already exists');

    // !Create new user
    const newUser = await prisma.users.create({
        data: {
            name,
            email,
            password: await hashPassword(password!),
            phoneNumber,
            isVerified: name.startsWith("dev") ? true : false,
        },
    });

    // !Generate token and Send verification email
    const verifyEmailToken = !newUser.isVerified && mailing(newUser, true, true);

    // !Return
    const { password: _, ...safe } = newUser;
    return { ...safe, verifyEmailToken };
}

export const verifyUserEmailService = async (userId: string) => {
    // !Extra validation
    const existingUser = await prisma.users.findUnique({ where: { id: userId } });
    if (!existingUser) throw new ApiError(404, 'User not found');
    if (existingUser.isVerified) throw new ApiError(400, 'User is already verified');

    // !Update isVerified
    await prisma.users.update({
        where: { id: userId },
        data: { isVerified: true },
    });

    // !Return
    return;
}

export const loginUserService = async (body: Pick<Users, "email" | "password">) => {
    const { email, password } = body;

    // !Extra validation
    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (!existingUser) throw new ApiError(404, 'User not found');
    // if (!existingUser.isVerified) throw new ApiError(401, 'Please verify your email first');
    const isPasswordValid = await comparePassword(password!, existingUser.password!);
    if (!isPasswordValid) throw new ApiError(401, 'Invalid email or password');

    // !Payload and Token signing
    const payload = { userId: existingUser.id };
    const accessToken = generateToken(payload, process.env.JWT_SECRET!, { expiresIn: "24h" });

    // !Return
    const { password: _, ...safe } = existingUser;
    return { ...safe, accessToken };
}

export const resendVerificationService = async (email: string) => {
    // !Extra validation
    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (!existingUser) throw new ApiError(404, 'User not found');
    if (existingUser.isVerified) throw new ApiError(400, 'User is already verified');

    // !Generate token and Send verification email
    mailing(existingUser);

    // !Return
    return;
}

export const forgotPasswordUserService = async (body: Pick<Users, "email">) => {
    const { email } = body;

    // !Extra validation
    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (!existingUser) throw new ApiError(404, 'User not found');
    // if (!existingUser.isVerified) throw new ApiError(401, 'Please verify your email first');

    // !Generate token and Send reset password email
    try {
        const payload = { userId: existingUser.id };
        const resetPasswordToken = generateToken(payload, process.env.JWT_SECRET!, { expiresIn: "30min" });

        const templateHtml = getTemplateUser(existingUser.name, resetPasswordToken);
        await resend.emails.send({
            from: FROM_EMAIL,
            to: existingUser.email,
            subject: "Please reset your password",
            html: templateHtml
        })
    } catch (error) {
        console.error(error);
        throw new ApiError(500, "Failed to send reset password email");
    }

    // !Return
    return;
}

export const resetPasswordUserService = async (userId: string, newPassword: string) => {
    // !Extra validation
    const existingUser = await prisma.users.findUnique({ where: { id: userId } });
    if (!existingUser) throw new ApiError(404, 'User not found');
    // if (!existingUser.isVerified) throw new ApiError(401, 'Please verify your email first');

    // !Update password
    await prisma.users.update({
        where: { id: userId },
        data: { password: await hashPassword(newPassword) },
    });

    // !Return
    return;
}

export const changePasswordUserService = async (userId: string, currentPassword: string, newPassword: string) => {
    // !Extra validation
    const existingUser = await prisma.users.findUnique({ where: { id: userId } });
    if (!existingUser) throw new ApiError(404, 'User not found');
    if (!existingUser.isVerified) throw new ApiError(401, 'Please verify your email first');
    const isPasswordValid = await comparePassword(currentPassword!, existingUser.password!);
    if (!isPasswordValid) throw new ApiError(401, 'Invalid current password');

    // !Update password
    await prisma.users.update({
        where: { id: userId },
        data: { password: await hashPassword(newPassword) },
    });

    // !Return
    return;
}

export const sessionLoginUserService = async (userId: string) => {
    // !Extra validation
    const existingUser = await prisma.users.findUnique({ where: { id: userId } });
    if (!existingUser) throw new ApiError(404, 'User not found');
    // if (!existingUser.isVerified) throw new ApiError(401, 'Please verify your email first');

    // !Return
    const { password: _, ...safe } = existingUser;
    return { ...safe };
}

export const updateUserProfileInfoService = async (
    userId: string,
    body: Pick<Users, "name" | "email" | "phoneNumber">
) => {
    const { name, email, phoneNumber } = body;

    // !Extra validation
    const existingUser = await prisma.users.findUnique({ where: { id: userId } });
    if (!existingUser) throw new ApiError(404, "User not found");

    // Check if email changed
    const emailChanged = email && email !== existingUser.email;
    if (emailChanged) {
        const emailExists = await prisma.users.findFirst({ where: { email } });
        if (emailExists) throw new ApiError(409, "Email already in use");
    }

    // Check if phone changed
    if (phoneNumber && phoneNumber !== existingUser.phoneNumber) {
        const phoneNumberExists = await prisma.users.findFirst({ where: { phoneNumber } });
        if (phoneNumberExists) throw new ApiError(409, "Phone number already in use");
    }

    // !Update user info
    const updatedUser = await prisma.users.update({
        where: { id: userId },
        data: { name, email, phoneNumber, isVerified: emailChanged ? false : existingUser.isVerified },
    });

    // !Return safe user and the flag
    const { password: _, ...safe } = updatedUser;
    return { user: safe, emailChanged };
};

// src/services/user.service.ts
export const uploadAvatarService = async (
    userId: string,
    file: Express.Multer.File
): Promise<string> => {
    // !Extra validation
    const user = await prisma.users.findUnique({
        where: { id: userId },
        select: { profilePicture: true },
    });
    if (!user) throw new ApiError(404, 'User not found');

    //! Upload new avatar
    const { url, public_id } = await CloudinaryService.uploadImage(
        file.buffer,
        'avatars'
    );

    //! Delete old avatar (if any)
    if (user.profilePicture) {
        const oldId = CloudinaryService.extractPublicId(user.profilePicture);
        if (oldId) await CloudinaryService.deleteImage(oldId);
    }

    //! Save new url
    await prisma.users.update({
        where: { id: userId },
        data: { profilePicture: url },
    });

    // !Return
    return url;
};

export const getCartInfoService = async (userId: string) => {
    const userCartInfo = await prisma.cart.findFirst({
        where: { userId },
        include: {
            items: true,
        },
    });

    return userCartInfo;
}

export const googleAuthUserService = () => {
    // !still consulting with the genius ChatGPT
}

export const googleAuthCallbackUserService = async (googleProfile: any) => {
    const email = googleProfile.emails?.[0]?.value;
    const name = googleProfile.displayName;
    const providerId = googleProfile.id;

    let user = await prisma.users.findUnique({ where: { email } });

    if (!user) {
        user = await prisma.users.create({
            data: {
                name,
                email,
                provider: "google",
                providerId,
                isVerified: true, // !WE BELIVE IN GOOGLE
            },
        });
    }

    const payload = { userId: user.id };
    const accessToken = generateToken(payload, process.env.JWT_SECRET!, { expiresIn: "2h" });

    const { password: _, ...safe } = user;
    return { ...safe, accessToken };
};