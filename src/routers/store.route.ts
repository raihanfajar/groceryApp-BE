import express from "express";
import { addStoreController, getStoreProductsController, updateStoreController } from "../controllers/store.controller";
import { verifySuperAdmin, verifyToken } from "../middlewares/auth.middleware";

const storeRouter = express.Router();

storeRouter.get("/products/:storeId", getStoreProductsController);
storeRouter.post("/add", verifyToken, verifySuperAdmin, addStoreController);
storeRouter.patch("/update/:storeId", verifyToken, verifySuperAdmin, updateStoreController);

export default storeRouter;