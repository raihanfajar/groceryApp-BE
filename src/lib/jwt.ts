import { sign, SignOptions } from "jsonwebtoken";

export const generateToken = (payload: any, secretKey: string, option: SignOptions) => {
    return sign(payload, secretKey, option);
}