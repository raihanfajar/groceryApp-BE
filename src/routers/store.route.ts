import express from "express";
import { addStoreController, deleteStoreController, getStoreProductsController, updateStoreController } from "../controllers/store.controller";
import { verifySuperAdmin, verifyToken } from "../middlewares/auth.middleware";

const storeRouter = express.Router();

storeRouter.get("/products/:storeId", getStoreProductsController);
storeRouter.post("/add", verifyToken, verifySuperAdmin, addStoreController);
storeRouter.patch("/update/:storeId", verifyToken, verifySuperAdmin, updateStoreController);
storeRouter.delete("/delete/:storeId", verifyToken, verifySuperAdmin, deleteStoreController);

export default storeRouter;