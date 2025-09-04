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

	async addProductToCart(userId: string, storeId: string, productId: string) {
		const cart = await prisma.cart.findFirst({
			where: { userId },
			select: { id: true },
		});

		if (!cart) {
			throw new ApiError(400, "User is not Found");
		}

		const stock = await prisma.storeProduct.findFirst({
			where: { productId, storeId },
			select: { stock: true },
		});
		if (!stock) {
			throw new ApiError(400, "Product is not Found");
		}
		if (stock.stock <= 0) {
			throw new ApiError(400, "Product is out of stock");
		}

		const addProduct = await prisma.cartProduct.findFirst({
			where: { cartId: cart.id, productId, storeId },
		});
		if (addProduct) {
			await prisma.cartProduct.update({
				where: { id: addProduct.id },
				data: { quantity: addProduct.quantity + 1 },
			});
			return addProduct;
		}

		const cartProduct = await prisma.cartProduct.create({
			data: {
				cartId: cart.id,
				productId,
				storeId,
				quantity: 1,
			},
		});
		return cartProduct;
	}

	async updateCartProductQuantity(
		userId: string,
		storeId: string,
		productId: string,
		quantity: number
	) {
		const cart = await prisma.cart.findFirst({
			where: { userId },
			select: { id: true },
		});

		if (!cart) {
			throw new ApiError(400, "User is not Found");
		}
		if (quantity === 0) {
			const cartProduct = await prisma.cartProduct.delete({
				where: {
					cartId_productId_storeId: { cartId: cart.id, productId, storeId },
				},
			});
			return cartProduct;
		} else {
			await prisma.$transaction(async (tx) => {
				const stock = await tx.storeProduct.findFirst({
					where: {
						productId,
						storeId,
					},
					select: {
						stock: true,
					},
				});
				if (!stock) {
					throw new ApiError(400, "Product is not Found");
				}
				if (stock && stock.stock < quantity) {
					throw new ApiError(400, "Not enough stock");
				}
				const cartProduct = await tx.cartProduct.update({
					where: {
						cartId_productId_storeId: { cartId: cart.id, productId, storeId },
					},
					data: {
						quantity,
					},
				});
				return cartProduct;
			});
		}
	}
}
