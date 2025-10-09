import prisma from "../config";
import { Users } from "../generated/prisma";
import { generateToken } from "../lib/jwt";
import { getVerifyUserEmailTemplate } from "../lib/nodemailer";
import { ApiError } from "../utils/ApiError";

import { Resend } from "resend"; //!new

const resend = new Resend(process.env.RESEND_API_KEY); //!new
const FROM_EMAIL = "FreshNear <no-reply@freshnear.store>"; //!new

export const mailing = async (targetUser: Users, rollbackNeeded: boolean = false, needReturnValue: boolean = false): Promise<string | void> => {
    let verifyEmailToken = "";
    try {
        const payload = { userId: targetUser.id };
        verifyEmailToken = generateToken(payload, process.env.JWT_SECRET!, { expiresIn: "30min" });
        const templateHtml = getVerifyUserEmailTemplate(targetUser.name, verifyEmailToken);
        // await transporter.sendMail({
        //     sender: "FreshNear",
        //     to: targetUser.email,
        //     subject: "Please verify your email",
        //     html: templateHtml
        // })
        await resend.emails.send({
            from: FROM_EMAIL,
            to: targetUser.email,
            subject: "Please verify your email",
            html: templateHtml,
        })
    } catch (error) {
        console.error(error);
        if (rollbackNeeded) await prisma.users.delete({ where: { id: targetUser.id } });
        throw new ApiError(500, "Failed to send verification email");
    }

    if (needReturnValue) return verifyEmailToken;
}

