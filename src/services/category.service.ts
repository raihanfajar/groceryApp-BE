import { ProductCategory } from '../generated/prisma';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { generateSlug, generateUniqueSlug } from '../utils/slug';

// ProductCategory now includes slug field from database
type ProductCategoryWithSlug = ProductCategory;

export interface CreateCategoryInput {
	name: string;
	description?: string;
	icon?: string;
}

export interface UpdateCategoryInput {
	name?: string;
	description?: string;
	icon?: string;
	isActive?: boolean;
}

export interface CategoryFilters {
	search?: string;
	isActive?: boolean;
}

export class CategoryService {
	/**
	 * Get all active categories
	 */
	static async getAllCategories(): Promise<ProductCategoryWithSlug[]> {
		const categories = await prisma.productCategory.findMany({
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

		// Return categories with database slug field
		return categories;
	}

	/**
	 * Get all categories for admin (including inactive)
	 * Supports filtering by search and isActive
	 */
	static async getAllCategoriesForAdmin(
		filters?: CategoryFilters
	): Promise<ProductCategoryWithSlug[]> {
		const whereClause: any = {
			deletedAt: null,
		};

		// Apply search filter
		if (filters?.search && filters.search.trim() !== '') {
			whereClause.OR = [
				{
					name: {
						contains: filters.search,
						mode: 'insensitive',
					},
				},
				{
					description: {
						contains: filters.search,
						mode: 'insensitive',
					},
				},
			];
		}

		// Apply isActive filter
		if (filters?.isActive !== undefined) {
			whereClause.isActive = filters.isActive;
		}

		const categories = await prisma.productCategory.findMany({
			where: whereClause,
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

		// Return categories with database slug field
		return categories;
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
	 * Get category by slug
	 */
	static async getCategoryBySlug(
		slug: string
	): Promise<ProductCategoryWithSlug | null> {
		return await prisma.productCategory.findFirst({
			where: {
				slug,
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
	): Promise<ProductCategoryWithSlug> {
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

		// Generate unique slug
		const baseSlug = generateSlug(data.name);
		const existingSlugs = await prisma.productCategory.findMany({
			where: { deletedAt: null },
			select: { slug: true },
		});
		const existingSlugStrings = existingSlugs.map((cat) => cat.slug);
		const uniqueSlug = generateUniqueSlug(data.name, existingSlugStrings);

		const newCategory = await prisma.productCategory.create({
			data: {
				name: data.name.trim(),
				slug: uniqueSlug,
				description: data.description?.trim(),
				icon: data.icon?.trim(),
			},
		});

		return newCategory;
	}

	/**
	 * Update category (Super Admin only)
	 */
	static async updateCategory(
		id: string,
		data: UpdateCategoryInput
	): Promise<ProductCategoryWithSlug> {
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

		// Generate new slug if name is being updated
		let newSlug: string | undefined;
		if (data.name) {
			const existingSlugs = await prisma.productCategory.findMany({
				where: {
					deletedAt: null,
					id: { not: id }, // Exclude current category
				},
				select: { slug: true },
			});
			const existingSlugStrings = existingSlugs.map((cat) => cat.slug);
			newSlug = generateUniqueSlug(data.name, existingSlugStrings);
		}

		const updatedCategory = await prisma.productCategory.update({
			where: { id },
			data: {
				...(data.name && { name: data.name.trim() }),
				...(newSlug && { slug: newSlug }),
				...(data.description !== undefined && {
					description: data.description?.trim() || null,
				}),
				...(data.icon !== undefined && {
					icon: data.icon?.trim() || null,
				}),
				...(data.isActive !== undefined && { isActive: data.isActive }),
			},
		});

		return updatedCategory;
	}

	/**
	 * Delete category (Super Admin only)
	 * @param id - Category ID
	 * @param hardDelete - If true, permanently delete from database (default: false for soft delete)
	 */
	static async deleteCategory(id: string, hardDelete = false): Promise<void> {
		// Check if category exists
		const category = await this.getCategoryById(id);
		if (!category) {
			throw new ApiError(404, 'Category not found');
		}

		// Check if category has active products
		const productsCount = await prisma.product.count({
			where: {
				categoryId: id,
				deletedAt: null,
			},
		});

		if (productsCount > 0) {
			throw new ApiError(
				400,
				`Cannot delete category "${category.name}". It has ${productsCount} active product(s) associated with it. Please remove or reassign these products first.`
			);
		}

		if (hardDelete) {
			// Hard delete - permanently remove from database
			try {
				await prisma.productCategory.delete({
					where: { id },
				});
			} catch (error: any) {
				// Check for foreign key constraint errors
				if (error.code === 'P2003') {
					throw new ApiError(
						400,
						`Cannot permanently delete category "${category.name}". It is referenced by other records in the system.`
					);
				}
				throw error;
			}
		} else {
			// Soft delete - set deletedAt timestamp
			await prisma.productCategory.update({
				where: { id },
				data: {
					deletedAt: new Date(),
				},
			});
		}
	}

	/**
	 * Permanently delete all soft-deleted categories that have no products
	 * (Super Admin only - cleanup utility)
	 */
	static async cleanupDeletedCategories(): Promise<{
		deleted: string[];
		skipped: Array<{ name: string; productCount: number }>;
	}> {
		const deletedCategories = await prisma.productCategory.findMany({
			where: {
				deletedAt: {
					not: null,
				},
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

		const deleted: string[] = [];
		const skipped: Array<{ name: string; productCount: number }> = [];

		for (const category of deletedCategories) {
			if (category._count.products === 0) {
				try {
					await prisma.productCategory.delete({
						where: { id: category.id },
					});
					deleted.push(category.name);
				} catch (error) {
					// If deletion fails, skip this category
					skipped.push({
						name: category.name,
						productCount: category._count.products,
					});
				}
			} else {
				skipped.push({
					name: category.name,
					productCount: category._count.products,
				});
			}
		}

		return { deleted, skipped };
	}

	/**
	 * Toggle category status (Super Admin only)
	 */
	static async toggleCategoryStatus(
		id: string
	): Promise<ProductCategoryWithSlug> {
		const category = await this.getCategoryById(id);
		if (!category) {
			throw new ApiError(404, 'Category not found');
		}

		const updatedCategory = await prisma.productCategory.update({
			where: { id },
			data: {
				isActive: !category.isActive,
			},
		});

		return updatedCategory;
	}
}
