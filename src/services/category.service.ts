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

		return updatedCategory;
	}
}
