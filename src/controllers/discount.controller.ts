import { Request, Response } from 'express';
import { DiscountService } from '../services/discount.service';
import { catchAsync } from '../utils/catchAsync';
import { ApiError } from '../utils/ApiError';
import { DiscountType, DiscountValueType } from '../generated/prisma';
import { AuthenticatedRequest } from '../types/express';

export class DiscountController {
	static createDiscount = catchAsync(
		async (req: AuthenticatedRequest, res: Response) => {
			const { user } = req;
			if (!user) {
				throw new ApiError(401, 'Authentication required');
			}

			const {
				name,
				description,
				type,
				valueType,
				value,
				maxDiscountAmount,
				minTransactionValue,
				maxUsagePerCustomer,
				totalUsageLimit,
				startDate,
				endDate,
				productIds,
				buyQuantity,
				getQuantity,
				applyToSameProduct,
				maxBogoSets,
			} = req.body;

			let { storeId } = req.body;

			// For store admins, use their assigned store
			if (!user.isSuper) {
				if (!user.storeId) {
					throw new ApiError(403, 'Store admin must be assigned to a store');
				}
				storeId = user.storeId;
			} else {
				// Super admin must specify store ID
				if (!storeId) {
					throw new ApiError(400, 'Store ID is required for Super Admin');
				}
			}

			// Validate required fields
			if (
				!name ||
				!type ||
				!valueType ||
				value === undefined ||
				!startDate ||
				!endDate ||
				!productIds?.length
			) {
				throw new ApiError(400, 'Missing required fields');
			}

			// Validate enum values
			if (!Object.values(DiscountType).includes(type)) {
				throw new ApiError(400, 'Invalid discount type');
			}

			if (!Object.values(DiscountValueType).includes(valueType)) {
				throw new ApiError(400, 'Invalid discount value type');
			}

			const discount = await DiscountService.createDiscount({
				storeId,
				name,
				description,
				type,
				valueType,
				value,
				maxDiscountAmount,
				minTransactionValue,
				maxUsagePerCustomer,
				totalUsageLimit,
				startDate: new Date(startDate),
				endDate: new Date(endDate),
				productIds,
				adminId: user.id,
				buyQuantity,
				getQuantity,
				applyToSameProduct,
				maxBogoSets,
			});

			res.status(201).json({
				status: 'success',
				message: 'Discount created successfully',
				data: discount,
			});
		}
	);

	static updateDiscount = catchAsync(
		async (req: AuthenticatedRequest, res: Response) => {
			const { user } = req;
			if (!user) {
				throw new ApiError(401, 'Authentication required');
			}

			const { discountId } = req.params;
			const updateData = req.body;

			// Convert date strings to Date objects if provided
			if (updateData.startDate) {
				updateData.startDate = new Date(updateData.startDate);
			}
			if (updateData.endDate) {
				updateData.endDate = new Date(updateData.endDate);
			}

			const discount = await DiscountService.updateDiscount(
				discountId,
				updateData,
				user.id
			);

			res.json({
				status: 'success',
				message: 'Discount updated successfully',
				data: discount,
			});
		}
	);

	static deleteDiscount = catchAsync(
		async (req: AuthenticatedRequest, res: Response) => {
			const { user } = req;
			if (!user) {
				throw new ApiError(401, 'Authentication required');
			}

			const { discountId } = req.params;

			await DiscountService.deleteDiscount(discountId, user.id);

			res.json({
				status: 'success',
				message: 'Discount deleted successfully',
			});
		}
	);

	static getDiscounts = catchAsync(
		async (req: AuthenticatedRequest, res: Response) => {
			const { user } = req;
			if (!user) {
				throw new ApiError(401, 'Authentication required');
			}

			const {
				storeId: queryStoreId,
				type,
				isActive,
				dateFrom,
				dateTo,
				page = 1,
				limit = 20,
			} = req.query;

			let storeId = queryStoreId as string;

			// For store admins, filter by their assigned store
			if (!user.isSuper) {
				if (!user.storeId) {
					throw new ApiError(403, 'Store admin must be assigned to a store');
				}
				storeId = user.storeId;
			}

			const filter = {
				storeId,
				type: type as DiscountType,
				isActive:
					isActive === 'true' ? true : isActive === 'false' ? false : undefined,
				dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
				dateTo: dateTo ? new Date(dateTo as string) : undefined,
				page: Number(page),
				limit: Number(limit),
			};

			const result = await DiscountService.getDiscounts(filter);

			res.json({
				status: 'success',
				data: result,
			});
		}
	);

	static getDiscountById = catchAsync(
		async (req: AuthenticatedRequest, res: Response) => {
			const { user } = req;
			if (!user) {
				throw new ApiError(401, 'Authentication required');
			}

			const { discountId } = req.params;

			const discount = await DiscountService.getDiscountById(discountId);

			// Check permissions for store admin
			if (!user.isSuper && user.storeId !== discount.storeId) {
				throw new ApiError(403, 'You can only view discounts for your store');
			}

			res.json({
				status: 'success',
				data: discount,
			});
		}
	);

	static applyDiscount = catchAsync(
		async (req: AuthenticatedRequest, res: Response) => {
			const { user } = req;
			if (!user) {
				throw new ApiError(401, 'Authentication required');
			}

			const { discountId, transactionId, userId, orderTotal } = req.body;

			if (!discountId || !orderTotal) {
				throw new ApiError(400, 'Discount ID and order total are required');
			}

			const result = await DiscountService.applyDiscount({
				discountId,
				transactionId,
				userId,
				adminId: user.id,
				orderTotal,
			});

			res.json({
				status: 'success',
				message: 'Discount applied successfully',
				data: result,
			});
		}
	);

	static getDiscountReport = catchAsync(
		async (req: AuthenticatedRequest, res: Response) => {
			const { user } = req;
			if (!user) {
				throw new ApiError(401, 'Authentication required');
			}

			const {
				storeId: queryStoreId,
				dateFrom,
				dateTo,
				page = 1,
				limit = 20,
			} = req.query;

			let storeId = queryStoreId as string;

			// For store admins, filter by their assigned store
			if (!user.isSuper) {
				if (!user.storeId) {
					throw new ApiError(403, 'Store admin must be assigned to a store');
				}
				storeId = user.storeId;
			}

			const result = await DiscountService.getDiscountReport(
				storeId,
				dateFrom ? new Date(dateFrom as string) : undefined,
				dateTo ? new Date(dateTo as string) : undefined,
				Number(page),
				Number(limit)
			);

			res.json({
				status: 'success',
				data: result,
			});
		}
	);

	static getAvailableDiscounts = catchAsync(
		async (req: AuthenticatedRequest, res: Response) => {
			const { storeId, orderTotal, productIds } = req.query;

			if (!storeId || !orderTotal || !productIds) {
				throw new ApiError(
					400,
					'Store ID, order total, and product IDs are required'
				);
			}

			const productIdArray = Array.isArray(productIds)
				? (productIds as string[])
				: (productIds as string).split(',');

			const discounts = await DiscountService.getAvailableDiscounts(
				storeId as string,
				Number(orderTotal),
				productIdArray
			);

			res.json({
				status: 'success',
				data: discounts,
			});
		}
	);
}
