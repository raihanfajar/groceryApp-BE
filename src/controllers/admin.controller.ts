import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/admin.service';
import { catchAsync } from '../utils/catchAsync';
import { ApiError } from '../utils/ApiError';

interface AuthenticatedRequest extends Request {
	user?: {
		id: string;
		isSuper: boolean;
		storeId?: string;
	};
}

export class AdminController {
	private adminService = new AdminService();

	// Admin login
	loginAdmin = catchAsync(async (req: Request, res: Response) => {
		const { email, password } = req.body;

		if (!email || !password) {
			throw new ApiError(400, 'Email and password are required');
		}

		const result = await this.adminService.loginAdmin(email, password);

		res.status(200).json({
			status: 'success',
			message: 'Login successful',
			data: result,
		});
	});

	// Get all users (Super Admin only)
	getAllUsers = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
		const adminId = req.user!.id;

		const users = await this.adminService.getAllUsers(adminId);

		res.status(200).json({
			status: 'success',
			message: 'Users retrieved successfully',
			data: {
				users,
				count: users.length,
			},
		});
	});

	// Get all store admins (Super Admin only)
	getAllStoreAdmins = catchAsync(
		async (req: AuthenticatedRequest, res: Response) => {
			const adminId = req.user!.id;

			const admins = await this.adminService.getAllStoreAdmins(adminId);

			res.status(200).json({
				status: 'success',
				message: 'Store admins retrieved successfully',
				data: {
					admins,
					count: admins.length,
				},
			});
		}
	);

	// Create store admin (Super Admin only)
	createStoreAdmin = catchAsync(
		async (req: AuthenticatedRequest, res: Response) => {
			const adminId = req.user!.id;
			const { name, email, password, storeId } = req.body;

			if (!name || !email || !password) {
				throw new ApiError(400, 'Name, email, and password are required');
			}

			const newAdmin = await this.adminService.createStoreAdmin(adminId, {
				name,
				email,
				password,
				storeId,
			});

			res.status(201).json({
				status: 'success',
				message: 'Store admin created successfully',
				data: newAdmin,
			});
		}
	);

	// Update store admin (Super Admin only)
	updateStoreAdmin = catchAsync(
		async (req: AuthenticatedRequest, res: Response) => {
			const adminId = req.user!.id;
			const { targetAdminId } = req.params;
			const { name, email, password, storeId } = req.body;

			const updatedAdmin = await this.adminService.updateStoreAdmin(
				adminId,
				targetAdminId,
				{ name, email, password, storeId }
			);

			res.status(200).json({
				status: 'success',
				message: 'Store admin updated successfully',
				data: updatedAdmin,
			});
		}
	);

	// Delete store admin (Super Admin only)
	deleteStoreAdmin = catchAsync(
		async (req: AuthenticatedRequest, res: Response) => {
			const adminId = req.user!.id;
			const { targetAdminId } = req.params;

			const result = await this.adminService.deleteStoreAdmin(
				adminId,
				targetAdminId
			);

			res.status(200).json({
				status: 'success',
				message: result.message,
			});
		}
	);

	// Get admin profile
	getProfile = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
		const adminId = req.user!.id;

		const admin = await this.adminService.getAdminProfile(adminId);

		res.status(200).json({
			status: 'success',
			message: 'Profile retrieved successfully',
			data: admin,
		});
	});
}
