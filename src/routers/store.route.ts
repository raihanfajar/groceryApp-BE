import express from "express";
import { getStoreProductsController } from "../controllers/store.controller";

const storeRouter = express.Router();

storeRouter.get("/products/:storeId", getStoreProductsController);

export default storeRouter;