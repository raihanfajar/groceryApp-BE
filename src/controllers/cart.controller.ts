import { Request, Response } from "express";
import { CartService } from "../services/cart.service";
import { catchAsync } from "../utils/catchAsync";
import { ApiError } from "../utils/ApiError";

export class CartController {
	private cartService = new CartService();

	cartCount = catchAsync(async (_: Request, res: Response) => {
		const userId = res.locals.payload;
		if (!userId) {
			throw new ApiError(400, "User ID is required");
		}
		const count = await this.cartService.getCartCount(userId);
		res.status(200).json({
			message: "Cart count retrieved successfully",
			data: { count },
		});
	});

	userCart = catchAsync(async (_: Request, res: Response) => {
		const userId = res.locals.payload;
		if (!userId) {
			throw new ApiError(400, "User ID is required");
		}
		const cart = await this.cartService.getUserCart(userId);
		res.status(200).json({
			message: "User cart retrieved successfully",
			data: { cart },
		});
	});

	addCartProduct = catchAsync(async (req: Request, res: Response) => {
		const userId = res.locals.payload;
		if (!userId) {
			throw new ApiError(400, "User ID is required");
		}
		const { storeId, productId } = req.body;
		const cart = await this.cartService.addProductToCart(userId, storeId, productId);
		res.status(200).json({
			message: "Cart product added successfully",
			data: { cart },
		});
	});

	updateCartProductQuantity = catchAsync(
		async (req: Request, res: Response) => {
			const userId = res.locals.payload;
			if (!userId) {
				throw new ApiError(400, "User ID is required");
			}
			const { storeId, productId, quantity } = req.body;
			const cart = await this.cartService.updateCartProductQuantity(
				userId,
				storeId,
				productId,
				quantity
			);
			res.status(200).json({
				message: "Cart product quantity / deleted updated successfully",
				data: { cart },
			});
		}
	);
}
