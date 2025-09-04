import express from "express";
import { CartController } from "../controllers/cart.controller";
import { verifyToken } from "../middlewares/auth.middleware";

const cartRouter = express.Router();
const cartController = new CartController();

// User Authentication
cartRouter.use(verifyToken)

// Get Cart Count
cartRouter.get("/count", cartController.cartCount);

// Get User Cart
cartRouter.get("/user", cartController.userCart);

// Add Cart Product
cartRouter.post("/add", cartController.addCartProduct); 

// Update Cart Product Quantity
cartRouter.put("/update", cartController.updateCartProductQuantity);

export default cartRouter;