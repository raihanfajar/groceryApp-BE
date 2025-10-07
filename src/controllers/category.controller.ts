import { Request, Response, NextFunction } from 'express';
import { CategoryService } from '../services/category.service';
import { ApiError } from '../utils/ApiError';
import { AuthenticatedRequest } from '../types/express';

export class CategoryController {
	/**
	 * GET /categories
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
	 * GET /admin/categories
	 * Get all categories for admin (including inactive)
	 * Query params: search, isActive
	 */
	static async getCategoriesForAdmin(
		req: AuthenticatedRequest,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const { search, isActive } = req.query;

			const filters = {
				search: search as string | undefined,
				isActive:
					isActive === 'true' ? true : isActive === 'false' ? false : undefined,
			};

			const categories =
				await CategoryService.getAllCategoriesForAdmin(filters);

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
	 * GET /categories/:id
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
	 * GET /categories/slug/:slug
	 * Get category by slug
	 */
	static async getCategoryBySlug(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const { slug } = req.params;
			const category = await CategoryService.getCategoryBySlug(slug);

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
	 * POST /admin/categories
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

			const { name, description, icon } = req.body;

			if (!name || name.trim().length === 0) {
				throw new ApiError(400, 'Category name is required');
			}

			const category = await CategoryService.createCategory({
				name: name.trim(),
				description: description?.trim(),
				icon: icon?.trim(),
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
	 * PUT /admin/categories/:id
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
			const { name, description, icon, isActive } = req.body;

			const updateData: any = {};
			if (name !== undefined) updateData.name = name.trim();
			if (description !== undefined)
				updateData.description = description?.trim();
			if (icon !== undefined) updateData.icon = icon?.trim();
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
	 * DELETE /admin/categories/:id?hard=true
	 * Delete category (Super Admin only)
	 * Query param 'hard=true' for permanent deletion, otherwise soft delete
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
			const hardDelete = req.query.hard === 'true';

			await CategoryService.deleteCategory(id, hardDelete);

			res.status(200).json({
				status: 'success',
				message: `Category ${hardDelete ? 'permanently deleted' : 'deleted'} successfully`,
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * PATCH /admin/categories/:id/toggle-status
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

	/**
	 * POST /admin/categories/cleanup-deleted
	 * Permanently delete all soft-deleted categories that have no products (Super Admin only)
	 */
	static async cleanupDeletedCategories(
		req: AuthenticatedRequest,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			if (!req.user?.isSuper) {
				throw new ApiError(
					403,
					'Only Super Admin can cleanup deleted categories'
				);
			}

			const result = await CategoryService.cleanupDeletedCategories();

			res.status(200).json({
				status: 'success',
				message: `Cleanup completed. ${result.deleted.length} categories permanently deleted, ${result.skipped.length} skipped.`,
				data: {
					deleted: result.deleted,
					skipped: result.skipped,
					summary: {
						deletedCount: result.deleted.length,
						skippedCount: result.skipped.length,
					},
				},
			});
		} catch (error) {
			next(error);
		}
	}
}
