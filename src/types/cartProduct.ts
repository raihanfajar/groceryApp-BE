import { Prisma } from "../generated/prisma";

export type CartProductWithDetails = Prisma.CartProductGetPayload<{
	include: { product: true };
}>;
