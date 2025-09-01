import express from 'express';
import { AdminController } from '../controllers/admin.controller';
import {
	verifyToken,
	verifyAdminRole,
	verifySuperAdmin,
} from '../middlewares/jwt.middleware';
import {
	validateAdminLogin,
	validateCreateStoreAdmin,
	validateUpdateStoreAdmin,
} from '../middlewares/validation.middleware';

const adminRouter = express.Router();
const adminController = new AdminController();

// Admin login (no auth required)
adminRouter.post('/login', validateAdminLogin, adminController.loginAdmin);

// Protected routes (require admin token)
adminRouter.use(verifyToken);
adminRouter.use(verifyAdminRole);

// Admin profile
adminRouter.get('/profile', adminController.getProfile);

// Super Admin only routes
adminRouter.use(verifySuperAdmin);

// User management
adminRouter.get('/users', adminController.getAllUsers);

// Store admin management
adminRouter.get('/store-admins', adminController.getAllStoreAdmins);
adminRouter.post(
	'/store-admins',
	validateCreateStoreAdmin,
	adminController.createStoreAdmin
);
adminRouter.put(
	'/store-admins/:targetAdminId',
	validateUpdateStoreAdmin,
	adminController.updateStoreAdmin
);
adminRouter.delete(
	'/store-admins/:targetAdminId',
	adminController.deleteStoreAdmin
);

export default adminRouter;
