import express from "express";
import { TransactionController } from "../controllers/transaction.controller";
import { mainVerifyToken } from "../middlewares/jwt.middleware";
import {
	verifyAdminRole,
	verifySuperAdmin,
	verifyToken,
} from "../middlewares/auth.middleware";
import { uploaderMulter } from "../middlewares/uploader.multer";

const transactionRouter = express.Router();
const transactionController = new TransactionController();
const uploader = uploaderMulter(
	["image"], // Menerima tipe file gambar (jpeg, png, gif, dll.)
	"memory"
);

// Midtrans notification
transactionRouter.post(
    "/midtrans/notification",
    transactionController.handleMidtransNotification
);

transactionRouter.use(mainVerifyToken);

// Get User Address
transactionRouter.get("/address", transactionController.userAddress);

// Create Transaction
transactionRouter.post("/create", transactionController.createUserTransaction);

// Upload payment proof
transactionRouter.post(
	"/upload-proof",
	uploader.single("paymentProof"),
	transactionController.uploadPaymentProof
);

// Completed User Transaction
transactionRouter.put(
	"/complete",
	transactionController.completedUserTransaction
);

// Get User Transaction
transactionRouter.get("/user", transactionController.getUserTransaction);

// Cancel user Transaction
transactionRouter.put("/cancel", transactionController.cancelUserTransaction);

// Protected routes (require admin token)
transactionRouter.use(verifyToken);
transactionRouter.use(verifyAdminRole);

//  Get All Store Transaction
transactionRouter.get("/admin", transactionController.getStoreTransaction);

// Confirming Store Transaction
transactionRouter.put(
	"/admin/confirm",
	transactionController.confirmingOrderTransaction
);

// Cancelling order Payment
transactionRouter.put(
	"/admin/cancel-payment",
	transactionController.cancelOrderPayment
);

// Shipping Store Transaction
transactionRouter.put(
	"/admin/shipping",
	transactionController.shippedTransaction
);

// Cancel Store Transaction
transactionRouter.put(
	"/admin/cancel",
	transactionController.cancelStoreTransaction
);

// Super Admin only routes
transactionRouter.use(verifySuperAdmin);

// Get All Transaction
transactionRouter.get("/admin/all", transactionController.getAllTransactions);

export default transactionRouter;
