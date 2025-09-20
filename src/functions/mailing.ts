import { Users } from "../generated/prisma";
import { generateToken } from "../lib/jwt";
import { getVerifyUserEmailTemplate, transporter } from "../lib/nodemailer";
import { ApiError } from "../utils/ApiError";
import prisma from "../config";

export const mailing = async (targetUser: Users, rollbackNeeded: boolean = false, needReturnValue: boolean = false) => {
    let verifyEmailToken = "";
    try {
        const payload = { userId: targetUser.id };
        verifyEmailToken = generateToken(payload, process.env.JWT_SECRET!, { expiresIn: "30min" });
        const templateHtml = getVerifyUserEmailTemplate(targetUser.name, verifyEmailToken);
        await transporter.sendMail({
            sender: "FreshNear",
            to: targetUser.email,
            subject: "Please verify your email",
            html: templateHtml
        })
    } catch (error) {
        console.error(error);
        if (rollbackNeeded) await prisma.users.delete({ where: { id: targetUser.id } });
        throw new ApiError(500, "Failed to send verification email");
    }

    if (needReturnValue) return verifyEmailToken;
}

