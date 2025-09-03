import { ProductCategory } from '../generated/prisma';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';

export interface CreateCategoryInput {
	name: string;
	description?: string;
}

export interface UpdateCategoryInput {
	name?: string;
	description?: string;
	isActive?: boolean;
}

export class CategoryService {
	/**
	 * Get all active categories
	 */
	static async getAllCategories(): Promise<ProductCategory[]> {
		return await prisma.productCategory.findMany({
			where: {
				deletedAt: null,
				isActive: true,
			},
			include: {
				_count: {
					select: {
						products: {
							where: {
								deletedAt: null,
								isActive: true,
							},
						},
					},
				},
			},
			orderBy: {
				name: 'asc',
			},
		});
	}

	/**
	 * Get all categories for admin (including inactive)
	 */
	static async getAllCategoriesForAdmin(): Promise<ProductCategory[]> {
		return await prisma.productCategory.findMany({
			where: {
				deletedAt: null,
			},
			include: {
				_count: {
					select: {
						products: {
							where: {
								deletedAt: null,
							},
						},
					},
				},
			},
			orderBy: {
				name: 'asc',
			},
		});
	}

	/**
	 * Get category by ID
	 */
	static async getCategoryById(id: string): Promise<ProductCategory | null> {
		return await prisma.productCategory.findFirst({
			where: {
				id,
				deletedAt: null,
			},
			include: {
				_count: {
					select: {
						products: {
							where: {
								deletedAt: null,
							},
						},
					},
				},
			},
		});
	}

	/**
	 * Create new category (Super Admin only)
	 */
	static async createCategory(
		data: CreateCategoryInput
	): Promise<ProductCategory> {
		// Check if category name already exists
		const existingCategory = await prisma.productCategory.findFirst({
			where: {
				name: {
					equals: data.name,
					mode: 'insensitive',
				},
				deletedAt: null,
			},
		});

		if (existingCategory) {
			throw new ApiError(400, 'Category with this name already exists');
		}

		return await prisma.productCategory.create({
			data: {
				name: data.name.trim(),
				description: data.description?.trim(),
			},
		});
	}

	/**
	 * Update category (Super Admin only)
	 */
	static async updateCategory(
		id: string,
		data: UpdateCategoryInput
	): Promise<ProductCategory> {
		// Check if category exists
		const category = await this.getCategoryById(id);
		if (!category) {
			throw new ApiError(404, 'Category not found');
		}

		// If updating name, check for duplicates
		if (data.name) {
			const existingCategory = await prisma.productCategory.findFirst({
				where: {
					name: {
						equals: data.name,
						mode: 'insensitive',
					},
					id: {
						not: id,
					},
					deletedAt: null,
				},
			});

			if (existingCategory) {
				throw new ApiError(400, 'Category with this name already exists');
			}
		}

		return await prisma.productCategory.update({
			where: { id },
			data: {
				...(data.name && { name: data.name.trim() }),
				...(data.description !== undefined && {
					description: data.description?.trim() || null,
				}),
				...(data.isActive !== undefined && { isActive: data.isActive }),
			},
		});
	}

	/**
	 * Delete category (Super Admin only)
	 */
	static async deleteCategory(id: string): Promise<void> {
		// Check if category exists
		const category = await this.getCategoryById(id);
		if (!category) {
			throw new ApiError(404, 'Category not found');
		}

		// Check if category has products
		const productsCount = await prisma.product.count({
			where: {
				categoryId: id,
				deletedAt: null,
			},
		});

		if (productsCount > 0) {
			throw new ApiError(
				400,
				`Cannot delete category. It has ${productsCount} product(s) associated with it.`
			);
		}

		// Soft delete
		await prisma.productCategory.update({
			where: { id },
			data: {
				deletedAt: new Date(),
			},
		});
	}

	/**
	 * Toggle category status (Super Admin only)
	 */
	static async toggleCategoryStatus(id: string): Promise<ProductCategory> {
		const category = await this.getCategoryById(id);
		if (!category) {
			throw new ApiError(404, 'Category not found');
		}

		return await prisma.productCategory.update({
			where: { id },
			data: {
				isActive: !category.isActive,
			},
		});
	}
}
