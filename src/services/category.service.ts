import { ProductCategory } from '../generated/prisma';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { generateSlug, generateUniqueSlug } from '../utils/slug';

// Extend ProductCategory to include dynamic slug
type ProductCategoryWithSlug = ProductCategory & { slug: string };

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

		// Add dynamic slug generation
		return categories.map((category) => ({
			...category,
			slug: generateSlug(category.name),
		}));
	}

	/**
	 * Get all categories for admin (including inactive)
	 */
	static async getAllCategoriesForAdmin(): Promise<ProductCategoryWithSlug[]> {
		const categories = await prisma.productCategory.findMany({
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

		// Add dynamic slug generation
		return categories.map((category) => ({
			...category,
			slug: generateSlug(category.name),
		}));
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
	 * Get category by slug (temporary implementation using name-based slug matching)
	 */
	static async getCategoryBySlug(
		slug: string
	): Promise<ProductCategoryWithSlug | null> {
		// Get all categories and find the one that would generate this slug
		const categories = await prisma.productCategory.findMany({
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
		});

		// Find category that would generate this slug
		const matchingCategory = categories.find((category) => {
			const categorySlug = generateSlug(category.name);
			return categorySlug === slug;
		});

		if (!matchingCategory) return null;

		return {
			...matchingCategory,
			slug: generateSlug(matchingCategory.name),
		};
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

		const newCategory = await prisma.productCategory.create({
			data: {
				name: data.name.trim(),
				description: data.description?.trim(),
			},
		});

		// Add dynamic slug generation
		return {
			...newCategory,
			slug: generateSlug(newCategory.name),
		} as ProductCategoryWithSlug;
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

		const updatedCategory = await prisma.productCategory.update({
			where: { id },
			data: {
				...(data.name && { name: data.name.trim() }),
				...(data.description !== undefined && {
					description: data.description?.trim() || null,
				}),
				...(data.isActive !== undefined && { isActive: data.isActive }),
			},
		});

		// Add dynamic slug generation
		return {
			...updatedCategory,
			slug: generateSlug(updatedCategory.name),
		} as ProductCategoryWithSlug;
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

		// Add dynamic slug generation
		return {
			...updatedCategory,
			slug: generateSlug(updatedCategory.name),
		} as ProductCategoryWithSlug;
	}
}
