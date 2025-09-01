import { sign, SignOptions, verify } from 'jsonwebtoken';

export const generateToken = (
	payload: any,
	secretKey: string,
	option: SignOptions
) => {
	return sign(payload, secretKey, option);
};

export const verifyToken = (token: string, secretKey: string) => {
	return verify(token, secretKey);
};
