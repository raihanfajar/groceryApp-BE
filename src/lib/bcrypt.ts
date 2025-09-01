import { compare, hash } from 'bcrypt';

export const hashPassword = async (password: string) => {
    const saltRounds = 10;
    return await hash(password, saltRounds);
}

export const comparePassword = async (password: string, hashedPassword: string) => {
    // Returns true if the password matches the hashed password, false otherwise
    return await compare(password, hashedPassword);
}