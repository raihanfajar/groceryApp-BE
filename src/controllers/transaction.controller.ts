import { Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync";
import { ApiError } from "../utils/ApiError";
import { TransactionService } from "../services/transaction.service";
import { MainAuthenticatedRequest } from "../middlewares/jwt.middleware";
import { OrderStatus } from "../generated/prisma";
import { AuthenticatedRequest } from "../types/express";

export class TransactionController {
	private transactionService = new TransactionService();

	userAddress = catchAsync(
		async (req: MainAuthenticatedRequest, res: Response) => {
			const { userId } = req.payload!;
			if (!userId) {
				throw new ApiError(400, "User ID is required");
			}
			const address = await this.transactionService.getUserAddress(userId);
			res.status(200).json({
				message: "User address retrieved successfully",
				data: { address },
			});
		}
	);

	uploadPaymentProof = catchAsync (
		async (req: MainAuthenticatedRequest, res: Response) => {
			const { userId } = req.payload!;
			const file = req.file as Express.Multer.File;
			const transactionId = req.query.transaction as string;
			if (!userId) {
				throw new ApiError(400, "User ID is required");
			}
			if (!file) {
				throw new ApiError(400, "Payment proof is required");
			}
			if (!transactionId) {
				throw new ApiError(400, "Transaction ID is required");
			}

			const paymentProof = await this.transactionService.uploadPaymentProof(userId, file, transactionId);
			res.status(200).json({
				message: "Payment proof uploaded successfully",
				data: { paymentProof },
			});
		}
	)

	getUserTransaction = catchAsync(
		async (req: MainAuthenticatedRequest, res: Response) => {
			const { userId } = req.payload!;
			const statusQuery = req.query.status as string;

			if (!userId) {
				throw new ApiError(400, "User ID is required");
			}

			if (
				statusQuery &&
				!Object.values(OrderStatus).includes(statusQuery as OrderStatus)
			) {
				throw new ApiError(400, `Invalid status value: ${statusQuery}`);
			}

			const transaction = await this.transactionService.getUserTransactions(
				userId,
				statusQuery as OrderStatus
			);

			res.status(200).json({
				message: "User transaction retrieved successfully",
				data: { transaction },
			});
		}
	);

	cancelUserTransaction = catchAsync(
		async (req: MainAuthenticatedRequest, res: Response) => {
			const { userId } = req.payload!;
			const transactionId = req.query.transaction as string;
			if (!userId) {
				throw new ApiError(400, "User ID is required");
			}
			if (!transactionId) {
				throw new ApiError(400, "Transaction ID is required");
			}
			const transaction = await this.transactionService.cancelUserTransaction(
				userId,
				transactionId
			);
			res.status(200).json({
				message: "User transaction canceled successfully",
				data: { transaction },
			});
		}
	);

	getAllStoreTransaction = catchAsync(
		async (req: AuthenticatedRequest, res: Response) => {
			const adminId = req.user!.id;
			const statusQuery = req.query.status as string;

			if (!adminId) {
				throw new ApiError(400, "User ID is required");
			}

			if (
				statusQuery &&
				!Object.values(OrderStatus).includes(statusQuery as OrderStatus)
			) {
				throw new ApiError(400, `Invalid status value: ${statusQuery}`);
			}

			const transaction = await this.transactionService.getUserTransactions(
				adminId,
				statusQuery as OrderStatus
			);

			res.status(200).json({
				message: "User transaction retrieved successfully",
				data: { transaction },
			});
		}
	);

	shippedTransaction = catchAsync(
		async (req: AuthenticatedRequest, res: Response) => {
			const transactionId = req.query.transaction as string;
			if (!transactionId) {
				throw new ApiError(400, "Transaction ID is required");
			}
			const transaction =
				await this.transactionService.shippingTransaction(transactionId);
			res.status(200).json({
				message: "User transaction canceled successfully",
				data: { transaction },
			}); 
		}
	);

	cancelStoreTransaction = catchAsync(
		async (req: AuthenticatedRequest, res: Response) => {
			const transactionId = req.query.transaction as string;
			if (!transactionId) {
				throw new ApiError(400, "Transaction ID is required");
			}
			const transaction =
				await this.transactionService.cancelStoreTransaction(transactionId);
			res.status(200).json({
				message: "User transaction canceled successfully",
				data: { transaction },
			});
		}
	);
}
