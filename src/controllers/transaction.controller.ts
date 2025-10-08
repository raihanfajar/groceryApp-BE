import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { ApiError } from '../utils/ApiError';
import { TransactionService } from '../services/transaction.service';
import { MainAuthenticatedRequest } from '../middlewares/jwt.middleware';
import { OrderStatus } from '../generated/prisma';
import { AuthenticatedRequest } from '../types/express';

export class TransactionController {
	private transactionService = new TransactionService();

	calculateShippingPrice = catchAsync(
		async (req: MainAuthenticatedRequest, res: Response) => {
			const { userId } = req.payload!;
			if (!userId) {
				throw new ApiError(400, 'User ID is required');
			}
			const { storeId } = req.query as { storeId: string };
			if (!storeId) {
				throw new ApiError(400, 'Store ID is required');
			}
			const { userAddressId } = req.query as { userAddressId: string };
			if (!userAddressId) {
				throw new ApiError(400, 'User address ID is required');
			}
			const shippingPrice =
				await this.transactionService.calculateShippingPrice(
					userId,
					userAddressId,
					storeId
				);
			res.status(200).json({
				message: 'Shipping price retrieved successfully',
				data: { shippingPrice },
			});
		}
	);

	userAddress = catchAsync(
		async (req: MainAuthenticatedRequest, res: Response) => {
			const { userId } = req.payload!;
			if (!userId) {
				throw new ApiError(400, 'User ID is required');
			}
			const address = await this.transactionService.getUserAddress(userId);
			res.status(200).json({
				message: 'User address retrieved successfully',
				data: { address },
			});
		}
	);

	createUserTransaction = catchAsync(
		async (req: MainAuthenticatedRequest, res: Response) => {
			const { userId } = req.payload!;

			const {
				userAddressId,
				storeId,
				shippingPrice,
				voucherProductCode,
				voucherDeliveryCode,
				paymentMethod,
			} = req.body;

			if (!userAddressId || !storeId || shippingPrice === undefined) {
				throw new ApiError(
					400,
					'userAddressId, storeId, and shippingPrice are required.'
				);
			}
			if (typeof shippingPrice !== 'number' || shippingPrice < 0) {
				throw new ApiError(400, 'shippingPrice must be a non-negative number.');
			}

			const result = await this.transactionService.createUserTransaction(
				userId,
				userAddressId,
				storeId,
				shippingPrice,
				paymentMethod,
				voucherProductCode,
				voucherDeliveryCode
			);

			res.status(201).json({
				message:
					'Transaction created successfully. Some items may be out of stock.',
				data: result,
			});
		}
	);

	handleMidtransNotification = catchAsync(
		async (req: Request, res: Response) => {
			const notificationPayload = req.body;

			await this.transactionService.handleMidtransNotification(
				notificationPayload
			);

			res.status(200).json({ status: 'ok' });
		}
	);

	uploadPaymentProof = catchAsync(
		async (req: MainAuthenticatedRequest, res: Response) => {
			const { userId } = req.payload!;
			const file = req.file as Express.Multer.File;
			const transactionId = req.query.transactionId as string;
			if (!userId) {
				throw new ApiError(400, 'User ID is required');
			}
			if (!file) {
				throw new ApiError(400, 'Payment proof is required');
			}
			if (!transactionId) {
				throw new ApiError(400, 'Transaction ID is required');
			}

			const paymentProof = await this.transactionService.uploadPaymentProof(
				userId,
				file,
				transactionId
			);
			res.status(200).json({
				message: 'Payment proof uploaded successfully',
				data: { paymentProof },
			});
		}
	);

	getUserTransaction = catchAsync(
		async (req: MainAuthenticatedRequest, res: Response) => {
			const { userId } = req.payload!;
			const statusQuery = req.query.status as string;

			if (!userId) {
				throw new ApiError(400, 'User ID is required');
			}

			if (
				statusQuery &&
				!Object.values(OrderStatus).includes(statusQuery as OrderStatus)
			) {
				throw new ApiError(400, `Invalid status value: ${statusQuery}`);
			}

			const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
			const pageSize = req.query.pageSize
				? parseInt(req.query.pageSize as string, 10)
				: 10;

			let parsedStartDate: Date | undefined;
			let parsedEndDate: Date | undefined;

			if (req.query.startDate) {
				const s = new Date(req.query.startDate as string);
				if (isNaN(s.getTime())) {
					throw new ApiError(400, 'Invalid startDate format');
				}
				parsedStartDate = s;
			}

			if (req.query.endDate) {
				const e = new Date(req.query.endDate as string);
				if (isNaN(e.getTime())) {
					throw new ApiError(400, 'Invalid endDate format');
				}
				parsedEndDate = e;
			}

			if (parsedStartDate && parsedEndDate && parsedStartDate > parsedEndDate) {
				throw new ApiError(400, 'startDate must be before or equal to endDate');
			}

			const transaction = await this.transactionService.getUserTransactions(
				userId,
				{
					status: statusQuery as OrderStatus,
					orderId: (req.query.orderId as string) || undefined,
					startDate: parsedStartDate,
					endDate: parsedEndDate,
					page,
					pageSize,
				}
			);

			res.status(200).json({
				message: 'User transaction retrieved successfully',
				data: transaction,
			});
		}
	);

	getUserTransactionDetail = catchAsync(
		async (req: MainAuthenticatedRequest, res: Response) => {
			const { userId } = req.payload!;
			const transactionId = req.query.transactionId as string;
			if (!userId) {
				throw new ApiError(400, 'User ID is required');
			}
			if (!transactionId) {
				throw new ApiError(400, 'Transaction ID is required');
			}
			const transaction =
				await this.transactionService.getUserTransactionDetail(
					userId,
					transactionId
				);
			res.status(200).json({
				message: 'User transaction detail retrieved successfully',
				data: { transaction },
			});
		}
	);

	completedUserTransaction = catchAsync(
		async (req: MainAuthenticatedRequest, res: Response) => {
			const { userId } = req.payload!;
			const transactionId = req.query.transactionId as string;
			if (!userId) {
				throw new ApiError(400, 'User ID is required');
			}
			if (!transactionId) {
				throw new ApiError(400, 'Transaction ID is required');
			}
			const transaction = await this.transactionService.completeUserTransaction(
				userId,
				transactionId
			);
			res.status(200).json({
				message: 'User transaction completed successfully',
				data: { transaction },
			});
		}
	);

	cancelUserTransaction = catchAsync(
		async (req: MainAuthenticatedRequest, res: Response) => {
			const { userId } = req.payload!;
			const transactionId = req.query.transactionId as string;
			if (!userId) {
				throw new ApiError(400, 'User ID is required');
			}
			if (!transactionId) {
				throw new ApiError(400, 'Transaction ID is required');
			}
			const transaction = await this.transactionService.cancelUserTransaction(
				userId,
				transactionId
			);
			res.status(200).json({
				message: 'User transaction canceled successfully',
				data: { transaction },
			});
		}
	);

	// Admin Transaction
	getStoreTransaction = catchAsync(
		async (req: AuthenticatedRequest, res: Response) => {
			const { id: adminId, isSuper } = req.user!;
			const statusQuery = req.query.status as string | undefined;
			const storeIdQuery = req.query.storeId as string | undefined;

			if (!adminId) {
				throw new ApiError(400, 'Admin ID is required');
			}

			let statusFilter: OrderStatus | undefined;
			if (statusQuery && statusQuery !== 'all') {
				if (!Object.values(OrderStatus).includes(statusQuery as OrderStatus)) {
					throw new ApiError(400, `Invalid status value: ${statusQuery}`);
				}
				statusFilter = statusQuery as OrderStatus;
			}

			let storeIdForService: string | undefined;
			if (isSuper && storeIdQuery && storeIdQuery !== 'all') {
				storeIdForService = storeIdQuery;
			}

			const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
			const pageSize = req.query.pageSize
				? parseInt(req.query.pageSize as string, 10)
				: 10;

			let parsedStartDate: Date | undefined;
			let parsedEndDate: Date | undefined;

			if (req.query.startDate) {
				const s = new Date(req.query.startDate as string);
				if (isNaN(s.getTime())) {
					throw new ApiError(400, 'Invalid startDate format');
				}
				parsedStartDate = s;
			}

			if (req.query.endDate) {
				const e = new Date(req.query.endDate as string);
				if (isNaN(e.getTime())) {
					throw new ApiError(400, 'Invalid endDate format');
				}
				parsedEndDate = e;
			}

			if (parsedStartDate && parsedEndDate && parsedStartDate > parsedEndDate) {
				throw new ApiError(400, 'startDate must be before or equal to endDate');
			}

			const transaction = await this.transactionService.getStoreTransactions(
				adminId,
				{
					status: statusFilter,
					orderId: (req.query.orderId as string) || undefined,
					startDate: parsedStartDate,
					endDate: parsedEndDate,
					page,
					pageSize,
					storeId: storeIdForService,
				}
			);

			res.status(200).json({
				message: 'Store transactions retrieved successfully',
				data: transaction,
			});
		}
	);

	confirmingOrderTransaction = catchAsync(
		async (req: AuthenticatedRequest, res: Response) => {
			const transactionId = req.query.transaction as string;
			if (!transactionId) {
				throw new ApiError(400, 'Transaction ID is required');
			}
			const transaction =
				await this.transactionService.confirmingOrderTransaction(transactionId);
			res.status(200).json({
				message: 'User transaction canceled successfully',
				data: { transaction },
			});
		}
	);

	cancelOrderPayment = catchAsync(
		async (req: AuthenticatedRequest, res: Response) => {
			const transactionId = req.query.transaction as string;
			if (!transactionId) {
				throw new ApiError(400, 'Transaction ID is required');
			}
			const transaction =
				await this.transactionService.cancelOrderPayment(transactionId);
			res.status(200).json({
				message: 'User transaction canceled successfully',
				data: { transaction },
			});
		}
	);

	shippedTransaction = catchAsync(
		async (req: AuthenticatedRequest, res: Response) => {
			const transactionId = req.query.transaction as string;
			if (!transactionId) {
				throw new ApiError(400, 'Transaction ID is required');
			}
			const transaction =
				await this.transactionService.shippingTransaction(transactionId);
			res.status(200).json({
				message: 'User transaction shipped successfully',
				data: { transaction },
			});
		}
	);

	cancelStoreTransaction = catchAsync(
		async (req: AuthenticatedRequest, res: Response) => {
			const transactionId = req.query.transaction as string;
			if (!transactionId) {
				throw new ApiError(400, 'Transaction ID is required');
			}
			const transaction =
				await this.transactionService.cancelStoreTransaction(transactionId);
			res.status(200).json({
				message: 'User transaction canceled successfully',
				data: { transaction },
			});
		}
	);

	getAllStoreList = catchAsync(
		async (req: AuthenticatedRequest, res: Response) => {
			const userId = req.user!.id;
			if (!userId) {
				throw new ApiError(400, 'User ID is required');
			}
			const storeList = await this.transactionService.getAllStoreList(userId);
			res.status(200).json({
				message: 'Store list retrieved successfully',
				data: { storeList },
			});
		}
	);
}
