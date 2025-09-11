import express from 'express';
import { DiscountController } from '../controllers/discount.controller';
import { DiscountMiddleware } from '../middlewares/discount.middleware';
import { verifyToken, verifyAdminRole } from '../middlewares/auth.middleware';

const discountRouter = express.Router();

// Public endpoint for getting available discounts (no auth required)
discountRouter.get(
	'/available/public',
	DiscountMiddleware.validateGetAvailableDiscounts,
	DiscountController.getAvailableDiscounts
);

// All other discount routes require authentication
discountRouter.use(verifyToken, verifyAdminRole);

// Create discount (admin only)
discountRouter.post(
	'/',
	DiscountMiddleware.validateCreateDiscount,
	DiscountController.createDiscount
);

// Update discount (admin only)
discountRouter.put(
	'/:discountId',
	DiscountMiddleware.validateUpdateDiscount,
	DiscountController.updateDiscount
);

// Delete discount (admin only)
discountRouter.delete('/:discountId', DiscountController.deleteDiscount);

// Get all discounts with filtering (admin only)
discountRouter.get(
	'/',
	DiscountMiddleware.validateQueryParams,
	DiscountController.getDiscounts
);

// Get discount by ID (admin only)
discountRouter.get('/:discountId', DiscountController.getDiscountById);

// Apply discount manually (admin only)
discountRouter.post(
	'/apply',
	DiscountMiddleware.validateApplyDiscount,
	DiscountController.applyDiscount
);

// Get discount usage report (admin only)
discountRouter.get(
	'/report/usage',
	DiscountMiddleware.validateQueryParams,
	DiscountController.getDiscountReport
);

export default discountRouter;
