import express from "express";
import { TransactionController } from "../controllers/transaction.controller";
import { mainVerifyToken } from "../middlewares/jwt.middleware";
import { verifyAdminRole, verifyToken } from "../middlewares/auth.middleware";
import { uploaderMulter } from "../middlewares/uploader.multer";

const transactionRouter = express.Router();
const transactionController = new TransactionController();
const uploader = uploaderMulter(
	["image"], // Menerima tipe file gambar (jpeg, png, gif, dll.)
	"memory" 
);


transactionRouter.use(mainVerifyToken);

// Get User Address
transactionRouter.get("/address", transactionController.userAddress);

// Create Transaction

// Upload payment proof
transactionRouter.post("/upload-proof", uploader.single("paymentProof"), transactionController.uploadPaymentProof);

// Get User Transaction
transactionRouter.get("/user", transactionController.getUserTransaction);

// Cancel user Transaction
transactionRouter.put("/cancel", transactionController.cancelUserTransaction);

// Protected routes (require admin token)
transactionRouter.use(verifyToken);
transactionRouter.use(verifyAdminRole);

//  Get All Store Transaction
transactionRouter.get("/admin", transactionController.getAllStoreTransaction);

// Shipping Store Transaction
transactionRouter.put("/admin/shipping", transactionController.shippedTransaction);

// Cancel Store Transaction
transactionRouter.put("/admin/cancel", transactionController.cancelStoreTransaction);

export default transactionRouter;
