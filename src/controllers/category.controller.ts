import { Request, Response, NextFunction } from 'express';
import { CategoryService } from '../services/category.service';
import { ApiError } from '../utils/ApiError';

interface AuthenticatedRequest extends Request {
	user?: {
		id: string;
		isSuper: boolean;
		storeId?: string;
	};
}

export class CategoryController {
	/**
	 * GET /api/categories
	 * Get all active categories (public)
	 */
	static async getCategories(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const categories = await CategoryService.getAllCategories();

			res.status(200).json({
				status: 'success',
				data: {
					categories,
				},
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * GET /api/admin/categories
	 * Get all categories for admin (including inactive)
	 */
	static async getCategoriesForAdmin(
		req: AuthenticatedRequest,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const categories = await CategoryService.getAllCategoriesForAdmin();

			res.status(200).json({
				status: 'success',
				data: {
					categories,
				},
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * GET /api/categories/:id
	 * Get category by ID
	 */
	static async getCategoryById(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const { id } = req.params;
			const category = await CategoryService.getCategoryById(id);

			if (!category) {
				throw new ApiError(404, 'Category not found');
			}

			res.status(200).json({
				status: 'success',
				data: {
					category,
				},
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * POST /api/admin/categories
	 * Create new category (Super Admin only)
	 */
	static async createCategory(
		req: AuthenticatedRequest,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			if (!req.user?.isSuper) {
				throw new ApiError(403, 'Only Super Admin can create categories');
			}

			const { name, description } = req.body;

			if (!name || name.trim().length === 0) {
				throw new ApiError(400, 'Category name is required');
			}

			const category = await CategoryService.createCategory({
				name: name.trim(),
				description: description?.trim(),
			});

			res.status(201).json({
				status: 'success',
				message: 'Category created successfully',
				data: {
					category,
				},
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * PUT /api/admin/categories/:id
	 * Update category (Super Admin only)
	 */
	static async updateCategory(
		req: AuthenticatedRequest,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			if (!req.user?.isSuper) {
				throw new ApiError(403, 'Only Super Admin can update categories');
			}

			const { id } = req.params;
			const { name, description, isActive } = req.body;

			const updateData: any = {};
			if (name !== undefined) updateData.name = name.trim();
			if (description !== undefined)
				updateData.description = description?.trim();
			if (isActive !== undefined) updateData.isActive = isActive;

			const category = await CategoryService.updateCategory(id, updateData);

			res.status(200).json({
				status: 'success',
				message: 'Category updated successfully',
				data: {
					category,
				},
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * DELETE /api/admin/categories/:id
	 * Delete category (Super Admin only)
	 */
	static async deleteCategory(
		req: AuthenticatedRequest,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			if (!req.user?.isSuper) {
				throw new ApiError(403, 'Only Super Admin can delete categories');
			}

			const { id } = req.params;
			await CategoryService.deleteCategory(id);

			res.status(200).json({
				status: 'success',
				message: 'Category deleted successfully',
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * PATCH /api/admin/categories/:id/toggle-status
	 * Toggle category status (Super Admin only)
	 */
	static async toggleCategoryStatus(
		req: AuthenticatedRequest,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			if (!req.user?.isSuper) {
				throw new ApiError(403, 'Only Super Admin can toggle category status');
			}

			const { id } = req.params;
			const category = await CategoryService.toggleCategoryStatus(id);

			res.status(200).json({
				status: 'success',
				message: `Category ${category.isActive ? 'activated' : 'deactivated'} successfully`,
				data: {
					category,
				},
			});
		} catch (error) {
			next(error);
		}
	}
}
