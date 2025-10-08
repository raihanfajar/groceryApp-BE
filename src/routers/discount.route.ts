import express from 'express';
import { DiscountController } from '../controllers/discount.controller';
import { DiscountMiddleware } from '../middlewares/discount.middleware';
import { verifyToken, verifyAdminRole } from '../middlewares/auth.middleware';
import { bannerUpload } from '../middlewares/banner.upload';

const discountRouter = express.Router();

// Public endpoint for getting available discounts (no auth required)
discountRouter.get(
	'/available/public',
	DiscountMiddleware.validateGetAvailableDiscounts,
	DiscountController.getAvailableDiscounts
);

// Public endpoint for getting marketing promos (for homepage jumbotron)
discountRouter.get('/marketing-promos', DiscountController.getMarketingPromos);

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

// Apply manual discount to cart (admin only)
discountRouter.post('/apply/manual', DiscountController.applyManualDiscount);

// Get discount usage report (admin only)
discountRouter.get(
	'/report/usage',
	DiscountMiddleware.validateQueryParams,
	DiscountController.getDiscountReport
);

// Marketing Promo routes (Super Admin only)
discountRouter.post(
	'/marketing-promos',
	bannerUpload.single('bannerImage'),
	DiscountController.createMarketingPromo
);

discountRouter.put(
	'/marketing-promos/:id',
	bannerUpload.single('bannerImage'),
	DiscountController.updateMarketingPromo
);

discountRouter.delete(
	'/marketing-promos/:id',
	DiscountController.deleteMarketingPromo
);

export default discountRouter;
