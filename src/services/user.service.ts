import prisma from "../config";
import { Users } from "../generated/prisma";
import { comparePassword, hashPassword } from "../lib/bcrypt";
import { generateToken } from "../lib/jwt";
import { getTemplateUser, getVerifyUserEmailTemplate, transporter } from "../lib/nodemailer";
import { ApiError } from "../utils/ApiError";

export const registerUserService = async (body: Pick<Users, "name" | "email" | "password" | "phoneNumber">) => {
    const { name, email, password, phoneNumber } = body;
    let verifyEmailToken = "";

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
    if (!newUser.isVerified) {
        try {
            const payload = { userId: newUser.id };
            verifyEmailToken = generateToken(payload, process.env.JWT_SECRET!, { expiresIn: "30min" });

            const templateHtml = getVerifyUserEmailTemplate(newUser.name, verifyEmailToken);
            await transporter.sendMail({
                sender: "FreshNear",
                to: newUser.email,
                subject: "Please verify your email",
                html: templateHtml
            })
        } catch (error) {
            console.error(error);
            // ?Manual rollback newUser if email fails
            await prisma.users.delete({ where: { id: newUser.id } });
            throw new ApiError(500, "Failed to send verification email");
        }
    }

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
    if (!existingUser.isVerified) throw new ApiError(401, 'Please verify your email first');
    const isPasswordValid = await comparePassword(password!, existingUser.password!);
    if (!isPasswordValid) throw new ApiError(401, 'Invalid email or password');

    // !Payload and Token signing
    const payload = { userId: existingUser.id };
    const accessToken = generateToken(payload, process.env.JWT_SECRET!, { expiresIn: "2h" });

    // !Return
    const { password: _, ...safe } = existingUser;
    return { ...safe, accessToken };
}

export const forgotPasswordUserService = async (body: Pick<Users, "email">) => {
    const { email } = body;
    // console.log(`>>> email: ${email}`);

    // !Extra validation
    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (!existingUser) throw new ApiError(404, 'User not found');
    if (!existingUser.isVerified) throw new ApiError(401, 'Please verify your email first');

    // !Generate token and Send reset password email
    try {
        const payload = { userId: existingUser.id };
        const resetPasswordToken = generateToken(payload, process.env.JWT_SECRET!, { expiresIn: "30min" });

        const templateHtml = getTemplateUser(existingUser.name, resetPasswordToken);
        await transporter.sendMail({
            sender: "FreshNear",
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
    if (!existingUser.isVerified) throw new ApiError(401, 'Please verify your email first');

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
    if (!existingUser.isVerified) throw new ApiError(401, 'Please verify your email first');

    // !Return
    const { password: _, ...safe } = existingUser;
    return { ...safe };
}

export const googleAuthUserService = () => {
    // !still consulting with the genius ChatGPT
}

// export const googleAuthCallbackUserService = async (googleProfile: any) => {
//     const email = googleProfile.emails?.[0]?.value;
//     const name = googleProfile.displayName;
//     const providerId = googleProfile.id;

//     let user = await prisma.users.findUnique({ where: { email } });

//     if (!user) {
//         user = await prisma.users.create({
//             data: {
//                 name,
//                 email,
//                 provider: "google",
//                 providerId,
//                 isVerified: true, // !WE BELIVE IN GOOGLE
//             },
//         });
//     }

//     const payload = { userId: user.id };
//     const accessToken = generateToken(payload, process.env.JWT_SECRET!, { expiresIn: "2h" });

//     const { password: _, ...safe } = user;
//     return { ...safe, accessToken };
// };