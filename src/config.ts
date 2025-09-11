import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from './generated/prisma';

export const NODE_ENV = process.env.NODE_ENV || 'development';

// Always use .env file (works for all environments)
config({ path: resolve(__dirname, '../.env') });
config({ path: resolve(__dirname, '../.env.local'), override: true });

// Load all environment variables from `.env` file
export const PORT = process.env.PORT || 8000;
export const DATABASE_URL = process.env.DATABASE_URL || '';

export default new PrismaClient();
