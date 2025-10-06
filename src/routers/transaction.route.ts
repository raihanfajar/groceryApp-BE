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
const uploader = uploaderMulter(["image"], "memory");

// --- Public route ---
// Midtrans notification does not need a token
transactionRouter.post(
	"/midtrans/notification",
	transactionController.handleMidtransNotification
);

// --- User protected routes ---
// These routes require a standard user token
transactionRouter.get(
	"/address",
	mainVerifyToken,
	transactionController.userAddress
);
transactionRouter.get(
	"/shipping",
	mainVerifyToken,
	transactionController.calculateShippingPrice
);
transactionRouter.post(
	"/create",
	mainVerifyToken,
	transactionController.createUserTransaction
);
transactionRouter.post(
	"/upload-proof",
	mainVerifyToken,
	uploader.single("paymentProof"),
	transactionController.uploadPaymentProof
);
transactionRouter.put(
	"/complete",
	mainVerifyToken,
	transactionController.completedUserTransaction
);
transactionRouter.get(
	"/user",
	mainVerifyToken,
	transactionController.getUserTransaction
);
transactionRouter.get(
	"/user-detail",
	mainVerifyToken,
	transactionController.getUserTransactionDetail
);
transactionRouter.put(
	"/cancel",
	mainVerifyToken,
	transactionController.cancelUserTransaction
);

// --- Admin protected routes ---
// These routes require admin verification
transactionRouter.get(
	"/admin",
	verifyToken,
	verifyAdminRole,
	transactionController.getStoreTransaction
);
transactionRouter.put(
	"/admin/confirm",
	verifyToken,
	verifyAdminRole,
	transactionController.confirmingOrderTransaction
);
transactionRouter.put(
	"/admin/cancel-payment",
	verifyToken,
	verifyAdminRole,
	transactionController.cancelOrderPayment
);
transactionRouter.put(
	"/admin/shipping",
	verifyToken,
	verifyAdminRole,
	transactionController.shippedTransaction
);
transactionRouter.put(
	"/admin/cancel",
	verifyToken,
	verifyAdminRole,
	transactionController.cancelStoreTransaction
);
transactionRouter.get(
	"/store",
	verifyToken,
	verifySuperAdmin,
	transactionController.getAllStoreList
)

export default transactionRouter;
