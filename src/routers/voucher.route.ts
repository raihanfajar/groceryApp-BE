import express from "express";
import { VoucherController } from "../controllers/voucher.controller";

const voucherRouter = express.Router();
const voucherController = new VoucherController();

// Get Voucher Product
voucherRouter.get("/product", voucherController.voucherProduct);

// Get Voucher Delivery
voucherRouter.get("/delivery", voucherController.voucherDelivery);

export default voucherRouter;