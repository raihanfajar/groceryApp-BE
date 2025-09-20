import { Prisma, OrderStatus } from "../generated/prisma";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";
import { cloudinaryUpload } from "../utils/cloudinary";

export class TransactionService {
	async getUserAddress(userId: string) {
		const address = await prisma.userAddress.findMany({
			where: { userId: userId },
		});
		if (!address) throw new ApiError(404, "User Address not found");
		return address;
	}

	async createUserTransaction(userId: string) {}

	async uploadPaymentProof(
		userId: string,
		file: Express.Multer.File,
		transactionId: string
	) {
		prisma.$transaction(async (tx) => {
			const transaction = await tx.transaction.findFirst({
				where: {
					id: transactionId,
					userId: userId,
				},
			});
			if (!transaction) throw new ApiError(404, "Transaction not found");
			if (!transaction || transaction.status !== "waiting_payment") {
				throw new Error(
					"Transaction must be ont waiting payment status to upload payment proof."
				);
			}

			const uploadedFile = await cloudinaryUpload(file.buffer);

			if (!uploadedFile || !uploadedFile.secure_url) {
				throw new Error("File upload to Cloudinary failed.");
			}
			const updatedTransaction = await tx.transaction.update({
				where: { id: transactionId },
				data: {
					status: "on_process",
					paymentProof: uploadedFile.url,
				},
			});
			return updatedTransaction;
		});
	}

	async getUserTransactions(userId: string, status?: OrderStatus) {
		const whereCondition: Prisma.TransactionWhereInput = {
			userId: userId,
		};

		if (status) {
			whereCondition.status = status;
		}

		const transactions = await prisma.transaction.findMany({
			where: whereCondition,
			include: {
				products: {
					include: {
						product: true,
					},
				},
			},
		});

		if (transactions.length === 0) {
			throw new ApiError(
				404,
				"No transactions found with the specified criteria"
			);
		}

		return transactions;
	}

	async cancelUserTransaction(userId: string, transactionId: string) {
		const transaction = await prisma.transaction.findUnique({
			where: { id: transactionId },
			include: { products: true },
		});

		if (!transaction) {
			throw new ApiError(404, "Transaction not found");
		}

		if (transaction.userId !== userId) {
			throw new ApiError(
				403,
				"You are not authorized to cancel this transaction"
			);
		}

		if (transaction.status !== "waiting_payment") {
			throw new ApiError(
				400,
				"Transaction can only be canceled if is not in waiting payment status"
			);
		}

		const canceledTransaction = await prisma.$transaction(async (tx) => {
			for (const product of transaction.products) {
				await tx.storeProduct.update({
					where: {
						storeId_productId: {
							storeId: transaction.storeId,
							productId: product.productId,
						},
					},
					data: {
						stock: {
							increment: product.quantity,
						},
					},
				});
			}
			await tx.transaction.update({
				where: { id: transactionId },
				data: {
					status: "cancelled",
				},
			});
		});

		return canceledTransaction;
	}

	// Admin transaction Actions
	async getAllStoreTransactions(adminId: string) {
		const admin = await prisma.admin.findFirst({
			where: {
				id: adminId,
			},
		});

		if (!admin) {
			throw new ApiError(404, "Admin not found");
		}
		const storeId = admin.storeId;

		if (!storeId) throw new ApiError(404, "Admin has no store assigned");

		const transactions = await prisma.transaction.findMany({
			where: {
				storeId: storeId,
			},
			include: {
				products: {
					include: {
						product: true,
					},
				},
			},
		});

		return transactions;
	}

	async shippingTransaction(transactionId: string) {
		const transaction = await prisma.transaction.findUnique({
			where: { id: transactionId },
			include: { products: true },
		});

		if (!transaction) {
			throw new ApiError(404, "Transaction not found");
		}

		const shippedTransaction = await prisma.transaction.update({
			where: { id: transactionId },
			data: {
				status: "shipped",
			},
		});

		return shippedTransaction;
	}

	async cancelStoreTransaction(transactionId: string) {
		const transaction = await prisma.transaction.findUnique({
			where: { id: transactionId },
			include: { products: true },
		});

		if (!transaction) {
			throw new ApiError(404, "Transaction not found");
		}

		const canceledTransaction = await prisma.$transaction(async (tx) => {
			for (const product of transaction.products) {
				await tx.storeProduct.update({
					where: {
						storeId_productId: {
							storeId: transaction.storeId,
							productId: product.productId,
						},
					},
					data: {
						stock: {
							increment: product.quantity,
						},
					},
				});
			}
			await tx.transaction.update({
				where: { id: transactionId },
				data: {
					status: "cancelled",
				},
			});
		});

		return canceledTransaction;
	}
}
