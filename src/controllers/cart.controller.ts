import { Request, Response } from "express";
import { CartService } from "../services/cart.service";
import { catchAsync } from "../utils/catchAsync";
import { ApiError } from "../utils/ApiError";

export class CartController {
	private cartService = new CartService();

	cartCount = catchAsync(async (req: Request, res: Response) => {
		const  userId  = res.locals.payload;
		if (!userId) {
			throw new ApiError(400, "User ID is required");
		}
		const count = await this.cartService.getCartCount(userId);
		res.json({ count });
	});
}
