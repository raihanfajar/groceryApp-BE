import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { verifyToken, verifyAdminRole } from '../middlewares/auth.middleware';
import {
	uploadProductImages,
	processProductImages,
} from '../middlewares/upload.middleware';

const router = Router();

// Public routes
router.get('/', ProductController.getProducts);
router.get('/:id', ProductController.getProductById);
router.get('/slug/:slug', ProductController.getProductBySlug);

// Admin routes (require authentication)
router.get(
	'/admin/all',
	verifyToken,
	verifyAdminRole,
	ProductController.getProductsForAdmin
);
router.post(
	'/admin',
	verifyToken,
	verifyAdminRole,
	uploadProductImages,
	processProductImages,
	ProductController.createProduct
);
router.put(
	'/admin/:id',
	verifyToken,
	verifyAdminRole,
	uploadProductImages,
	processProductImages,
	ProductController.updateProduct
);
router.delete(
	'/admin/:id',
	verifyToken,
	verifyAdminRole,
	ProductController.deleteProduct
);
router.patch(
	'/admin/:id/toggle-status',
	verifyToken,
	verifyAdminRole,
	ProductController.toggleProductStatus
);
router.put(
	'/admin/:id/stock',
	verifyToken,
	verifyAdminRole,
	ProductController.updateProductStock
);

export default router;
