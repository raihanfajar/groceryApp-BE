import { ApiError } from "../../utils/ApiError";
import prisma from "../../config";

export const validateRegisterUser = async ({ ...body }) => {
    const { name, email, password, phoneNumber } = body;
    if (!name || !email || !password || !phoneNumber) throw new ApiError(400, 'All fields are required (DARI DALEMAN)');

    const existingEmail = await prisma.users.findUnique({ where: { email } });
    if (existingEmail) throw new ApiError(409, 'Email already exists');
}