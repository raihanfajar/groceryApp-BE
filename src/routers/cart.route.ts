import express from "express";
import { CartController } from "../controllers/cart.controller";
import { mainVerifyToken } from "../middlewares/jwt.middleware";

const cartRouter = express.Router();
const cartController = new CartController();

// Get Cart Count
cartRouter.get("/count", mainVerifyToken, cartController.cartCount);

// Get User Cart
cartRouter.get("/user", mainVerifyToken, cartController.userCart);

// Add Cart Product
cartRouter.post("/add", mainVerifyToken, cartController.addCartProduct);

// Update Cart Product Quantity
cartRouter.put(
	"/update",
	mainVerifyToken,
	cartController.updateCartProductQuantity
);

export default cartRouter;
