import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";

export class CartService {
	async getCartCount(userId: string) {
		await prisma.$transaction(async (tx) => {
			const cart = await tx.cart.findFirst({
				where: { userId },
				select: { id: true },
			});

			if (!cart) {
				throw new ApiError(400, "User is not Found");
			}

			const count = await tx.cartProduct.count({
				where: { cartId: cart.id },
			});
			return count;
		});
	}

	async getUserCart(userId: string) {
		const cart = await prisma.cart.findFirst({
			where: { userId },
			include: {
				items: {
					include: {
						product: true,
					},
				},
			},
		});
		return cart;
	}

	async updateCartProductQuantity(cartProductId: string, quantity: number) {
		if (quantity === 0) {
			const cartProduct = await prisma.cartProduct.delete({
				where: { id: cartProductId },
			});
			return cartProduct;
		} else {
			const cartProduct = await prisma.cartProduct.update({
				where: { id: cartProductId },
				data: {
					quantity,
				},
			});
			return cartProduct;
		}
	}
}
