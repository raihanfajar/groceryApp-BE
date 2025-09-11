import { Request, Response } from "express";
import { CartService } from "../services/cart.service";
import { catchAsync } from "../utils/catchAsync";
import { ApiError } from "../utils/ApiError";
import { MainAuthenticatedRequest } from "../middlewares/jwt.middleware";

export class CartController {
	private cartService = new CartService();

	cartCount = catchAsync(
		async (req: MainAuthenticatedRequest, res: Response) => {
			const { userId } = req.payload!;
			const storeId = "7658f570-f8a7-4fb4-901a-433a21047108";
			if (!userId) {
				throw new ApiError(400, "User ID is required");
			}
			const count = await this.cartService.getCartCount(userId, storeId);
			res.status(200).json({
				message: "Cart count retrieved successfully",
				data: { count },
			});
		}
	);

	userCart = catchAsync(
		async (req: MainAuthenticatedRequest, res: Response) => {
			const { userId } = req.payload!;
			if (!userId) {
				throw new ApiError(400, "User ID is required");
			}
			const cart = await this.cartService.getUserCart(userId);
			res.status(200).json({
				message: "User cart retrieved successfully",
				data: { cart },
			});
		}
	);

	addCartProduct = catchAsync(
		async (req: MainAuthenticatedRequest, res: Response) => {
			const { userId } = req.payload!;
			if (!userId) {
				throw new ApiError(400, "User ID is required");
			}
			const { storeId, productId } = req.body;
			const cart = await this.cartService.addProductToCart(
				userId,
				storeId,
				productId
			);
			res.status(200).json({
				message: "Cart product added successfully",
				data: { cart },
			});
		}
	);

	updateCartProductQuantity = catchAsync(
		async (req: MainAuthenticatedRequest, res: Response) => {
			const { userId } = req.payload!;
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
