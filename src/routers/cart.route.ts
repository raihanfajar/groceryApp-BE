import express from "express";
import { CartController } from "../controllers/cart.controller";

const cartRouter = express.Router();
const cartController = new CartController();

// Get Cart Count
cartRouter.get("/count", cartController.cartCount);

export default cartRouter;
