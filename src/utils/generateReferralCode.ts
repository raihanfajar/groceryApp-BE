// import { customAlphabet } from 'nanoid';
// import prisma from "../config";
// import { ApiError } from './ApiError';


// export const generateReferralCode = async (): Promise<string> => {
//     const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
//     const nanoid = customAlphabet(alphabet, 8);

//     let attempts = 0;
//     const maxAttempts = 5;

//     while (attempts < maxAttempts) {
//         const code = nanoid();
//         const existing = await prisma.users.findFirst({ where: { refferalCode: code } });

//         if (!existing) return code; // Unique code generated and returned
//         attempts++;
//     }

//     throw new ApiError(500, 'Failed to generate unique referral code', false);
// };