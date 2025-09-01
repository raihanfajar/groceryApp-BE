import { PrismaClient } from '../generated/prisma';

declare global {
	var __prisma: PrismaClient | undefined;
}

export const prisma = globalThis.__prisma || new PrismaClient();

if (process.env.NODE_ENV === 'development') {
	globalThis.__prisma = prisma;
}
