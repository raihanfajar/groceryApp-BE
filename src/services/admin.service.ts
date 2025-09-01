import { prisma } from '../lib/prisma';
import { hashPassword, comparePassword } from '../lib/bcrypt';
import { generateToken } from '../lib/jwt';
import { ApiError } from '../utils/ApiError';

export class AdminService {
	// Admin login
	async loginAdmin(email: string, password: string) {
		const admin = await prisma.admin.findUnique({
			where: { email },
			include: {
				store: {
					select: {
						id: true,
						name: true,
						city: true,
						province: true,
					},
				},
			},
		});

		if (!admin) {
			throw new ApiError(401, 'Invalid email or password');
		}

		const isPasswordValid = await comparePassword(password, admin.password);
		if (!isPasswordValid) {
			throw new ApiError(401, 'Invalid email or password');
		}

		const token = generateToken(
			{
				id: admin.id,
				email: admin.email,
				isSuper: admin.isSuper,
				storeId: admin.storeId,
				role: 'admin',
			},
			process.env.JWT_SECRET!,
			{ expiresIn: '24h' }
		);

		return {
			admin: {
				id: admin.id,
				name: admin.name,
				email: admin.email,
				isSuper: admin.isSuper,
				store: admin.store,
			},
			token,
		};
	}

	// Get all users (Super Admin only)
	async getAllUsers(adminId: string) {
		const admin = await this.validateSuperAdmin(adminId);

		const users = await prisma.users.findMany({
			where: { deletedAt: null },
			select: {
				id: true,
				name: true,
				email: true,
				phoneNumber: true,
				isVerified: true,
				createdAt: true,
				addresses: {
					where: { deletedAt: null },
					select: {
						id: true,
						city: true,
						province: true,
						isDefault: true,
					},
				},
			},
			orderBy: { createdAt: 'desc' },
		});

		return users;
	}

	// Get all store admins (Super Admin only)
	async getAllStoreAdmins(adminId: string) {
		const admin = await this.validateSuperAdmin(adminId);

		const storeAdmins = await prisma.admin.findMany({
			where: {
				deletedAt: null,
				isSuper: false,
			},
			include: {
				store: {
					select: {
						id: true,
						name: true,
						city: true,
						province: true,
					},
				},
			},
			orderBy: { createdAt: 'desc' },
		});

		return storeAdmins;
	}

	// Create store admin (Super Admin only)
	async createStoreAdmin(
		adminId: string,
		data: {
			name: string;
			email: string;
			password: string;
			storeId?: string;
		}
	) {
		await this.validateSuperAdmin(adminId);

		// Check if email already exists
		const existingAdmin = await prisma.admin.findUnique({
			where: { email: data.email },
		});

		if (existingAdmin) {
			throw new ApiError(409, 'Email already exists');
		}

		// Validate store if storeId provided
		if (data.storeId) {
			const store = await prisma.store.findUnique({
				where: { id: data.storeId },
			});
			if (!store) {
				throw new ApiError(404, 'Store not found');
			}
		}

		const hashedPassword = await hashPassword(data.password);

		const newAdmin = await prisma.admin.create({
			data: {
				name: data.name,
				email: data.email,
				password: hashedPassword,
				storeId: data.storeId,
				isSuper: false,
			},
			include: {
				store: {
					select: {
						id: true,
						name: true,
						city: true,
						province: true,
					},
				},
			},
		});

		// Remove password from response
		const { password, ...adminResponse } = newAdmin;
		return adminResponse;
	}

	// Update store admin (Super Admin only)
	async updateStoreAdmin(
		adminId: string,
		targetAdminId: string,
		data: {
			name?: string;
			email?: string;
			password?: string;
			storeId?: string;
		}
	) {
		await this.validateSuperAdmin(adminId);

		// Check if target admin exists and is not super admin
		const targetAdmin = await prisma.admin.findUnique({
			where: { id: targetAdminId },
		});

		if (!targetAdmin) {
			throw new ApiError(404, 'Admin not found');
		}

		if (targetAdmin.isSuper) {
			throw new ApiError(403, 'Cannot modify super admin');
		}

		// Check email uniqueness if email is being updated
		if (data.email && data.email !== targetAdmin.email) {
			const existingAdmin = await prisma.admin.findUnique({
				where: { email: data.email },
			});
			if (existingAdmin) {
				throw new ApiError(409, 'Email already exists');
			}
		}

		// Validate store if storeId provided
		if (data.storeId) {
			const store = await prisma.store.findUnique({
				where: { id: data.storeId },
			});
			if (!store) {
				throw new ApiError(404, 'Store not found');
			}
		}

		const updateData: any = {};
		if (data.name) updateData.name = data.name;
		if (data.email) updateData.email = data.email;
		if (data.storeId !== undefined) updateData.storeId = data.storeId;
		if (data.password) {
			updateData.password = await hashPassword(data.password);
		}

		const updatedAdmin = await prisma.admin.update({
			where: { id: targetAdminId },
			data: updateData,
			include: {
				store: {
					select: {
						id: true,
						name: true,
						city: true,
						province: true,
					},
				},
			},
		});

		// Remove password from response
		const { password, ...adminResponse } = updatedAdmin;
		return adminResponse;
	}

	// Delete store admin (Super Admin only)
	async deleteStoreAdmin(adminId: string, targetAdminId: string) {
		await this.validateSuperAdmin(adminId);

		// Check if target admin exists and is not super admin
		const targetAdmin = await prisma.admin.findUnique({
			where: { id: targetAdminId },
		});

		if (!targetAdmin) {
			throw new ApiError(404, 'Admin not found');
		}

		if (targetAdmin.isSuper) {
			throw new ApiError(403, 'Cannot delete super admin');
		}

		// Soft delete
		await prisma.admin.update({
			where: { id: targetAdminId },
			data: { deletedAt: new Date() },
		});

		return { message: 'Admin deleted successfully' };
	}

	// Get admin profile
	async getAdminProfile(adminId: string) {
		const admin = await prisma.admin.findUnique({
			where: { id: adminId },
			include: {
				store: {
					select: {
						id: true,
						name: true,
						city: true,
						province: true,
					},
				},
			},
		});

		if (!admin) {
			throw new ApiError(404, 'Admin not found');
		}

		// Remove password from response
		const { password, ...adminResponse } = admin;
		return adminResponse;
	}

	// Helper method to validate super admin
	private async validateSuperAdmin(adminId: string) {
		const admin = await prisma.admin.findUnique({
			where: { id: adminId },
		});

		if (!admin) {
			throw new ApiError(404, 'Admin not found');
		}

		if (!admin.isSuper) {
			throw new ApiError(403, 'Super admin access required');
		}

		return admin;
	}
}
