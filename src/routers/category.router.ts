import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { verifyToken, verifyAdminRole } from '../middlewares/auth.middleware';

const router = Router();

// Public routes
router.get('/', CategoryController.getCategories);
router.get('/:id', CategoryController.getCategoryById);

// Admin routes (require authentication)
router.get(
	'/admin/all',
	verifyToken,
	verifyAdminRole,
	CategoryController.getCategoriesForAdmin
);
router.post(
	'/admin',
	verifyToken,
	verifyAdminRole,
	CategoryController.createCategory
);
router.put(
	'/admin/:id',
	verifyToken,
	verifyAdminRole,
	CategoryController.updateCategory
);
router.delete(
	'/admin/:id',
	verifyToken,
	verifyAdminRole,
	CategoryController.deleteCategory
);
router.patch(
	'/admin/:id/toggle-status',
	verifyToken,
	verifyAdminRole,
	CategoryController.toggleCategoryStatus
);

export default router;
