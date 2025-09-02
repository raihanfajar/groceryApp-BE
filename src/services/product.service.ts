import { Product, StoreProduct, Prisma } from '../generated/prisma';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';

export interface CreateProductInput {
	name: string;
	description: string;
	categoryId: string;
	price: number;
	weight?: number;
	picture1: string;
	picture2?: string;
	picture3?: string;
	picture4?: string;
}

export interface UpdateProductInput {
	name?: string;
	description?: string;
	categoryId?: string;
	price?: number;
	weight?: number;
	picture1?: string;
	picture2?: string;
	picture3?: string;
	picture4?: string;
	isActive?: boolean;
}

export interface ProductFilters {
	search?: string;
	categoryId?: string;
	storeId?: string;
	minPrice?: number;
	maxPrice?: number;
	isActive?: boolean;
}

export interface ProductWithStock extends Product {
	totalStock: number;
	storeStock?: (StoreProduct & {
		store: {
			id: string;
			name: string;
		};
	})[];
	category: {
		id: string;
		name: string;
	};
}

export class ProductService {
	/**
	 * Generate unique slug from product name
	 */
	private static generateSlug(name: string): string {
		return name
			.toLowerCase()
			.replace(/[^a-z0-9\s-]/g, '') // Remove special characters
			.replace(/\s+/g, '-') // Replace spaces with hyphens
			.replace(/-+/g, '-') // Replace multiple hyphens with single
			.trim();
	}

	/**
	 * Get all products with filtering and search
	 */
	static async getProducts(
		filters: ProductFilters = {},
		page: number = 1,
		limit: number = 20
	): Promise<{
		products: ProductWithStock[];
		pagination: {
			page: number;
			limit: number;
			total: number;
			totalPages: number;
		};
	}> {
		const {
			search,
			categoryId,
			storeId,
			minPrice,
			maxPrice,
			isActive = true,
		} = filters;

		const skip = (page - 1) * limit;

		// Build where clause - simplified for current schema
		const whereClause: Prisma.ProductWhereInput = {
			deletedAt: null,
			isActive,
			...(categoryId && { categoryId }),
			...(search && {
				OR: [
					{
						name: {
							contains: search,
							mode: 'insensitive' as const,
						},
					},
					{
						description: {
							contains: search,
							mode: 'insensitive' as const,
						},
					},
				],
			}),
			...((minPrice !== undefined || maxPrice !== undefined) && {
				price: {
					...(minPrice !== undefined && { gte: minPrice }),
					...(maxPrice !== undefined && { lte: maxPrice }),
				},
			}),
			// Note: storeId filtering removed due to current schema limitations
		};

		// Get total count
		const total = await prisma.product.count({ where: whereClause });

		// Get products with related data
		const products = await prisma.product.findMany({
			where: whereClause,
			include: {
				category: {
					select: {
						id: true,
						name: true,
					},
				},
				storeStock: {
					where: {
						deletedAt: null,
					},
					include: {
						store: {
							select: {
								id: true,
								name: true,
							},
						},
					},
				},
			},
			orderBy: {
				createdAt: 'desc',
			},
			skip,
			take: limit,
		});

		// Calculate total stock for each product
		const productsWithStock: ProductWithStock[] = products.map((product) => ({
			...product,
			totalStock:
				product.storeStock?.reduce(
					(total: number, stock: any) => total + stock.stock,
					0
				) || 0,
		}));

		return {
			products: productsWithStock,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		};
	}

	/**
	 * Get product by ID
	 */
	static async getProductById(id: string): Promise<ProductWithStock | null> {
		const product = await prisma.product.findFirst({
			where: {
				id,
				deletedAt: null,
			},
			include: {
				category: {
					select: {
						id: true,
						name: true,
					},
				},
				storeStock: {
					where: {
						deletedAt: null,
					},
					include: {
						store: {
							select: {
								id: true,
								name: true,
							},
						},
					},
				},
			},
		});

		if (!product) return null;

		return {
			...product,
			totalStock:
				product.storeStock?.reduce(
					(total: number, stock: any) => total + stock.stock,
					0
				) || 0,
		};
	}

	/**
	 * Get product by slug
	 */
	static async getProductBySlug(
		slug: string
	): Promise<ProductWithStock | null> {
		const product = await prisma.product.findFirst({
			where: {
				slug,
				deletedAt: null,
				isActive: true,
			},
			include: {
				category: {
					select: {
						id: true,
						name: true,
					},
				},
				storeStock: {
					where: {
						deletedAt: null,
					},
					include: {
						store: {
							select: {
								id: true,
								name: true,
							},
						},
					},
				},
			},
		});

		if (!product) return null;

		return {
			...product,
			totalStock:
				product.storeStock?.reduce(
					(total: number, stock: any) => total + stock.stock,
					0
				) || 0,
		};
	}

	/**
	 * Create new product (Super Admin only)
	 */
	static async createProduct(data: CreateProductInput): Promise<Product> {
		// Check if category exists
		const category = await prisma.productCategory.findFirst({
			where: {
				id: data.categoryId,
				deletedAt: null,
				isActive: true,
			},
		});

		if (!category) {
			throw new ApiError(400, 'Category not found or inactive');
		}

		// Generate slug and check uniqueness
		const baseSlug = this.generateSlug(data.name);
		let slug = baseSlug;
		let counter = 1;

		while (true) {
			const existingProduct = await prisma.product.findFirst({
				where: {
					slug,
					deletedAt: null,
				},
			});

			if (!existingProduct) break;

			slug = `${baseSlug}-${counter}`;
			counter++;
		}

		// Check if product name already exists
		const existingProductByName = await prisma.product.findFirst({
			where: {
				name: {
					equals: data.name,
					mode: 'insensitive',
				},
				deletedAt: null,
			},
		});

		if (existingProductByName) {
			throw new ApiError(400, 'Product with this name already exists');
		}

		return await prisma.product.create({
			data: {
				name: data.name.trim(),
				description: data.description.trim(),
				slug,
				categoryId: data.categoryId,
				price: data.price,
				weight: data.weight,
				picture1: data.picture1,
				picture2: data.picture2,
				picture3: data.picture3,
				picture4: data.picture4,
			},
		});
	}

	/**
	 * Update product (Super Admin only)
	 */
	static async updateProduct(
		id: string,
		data: UpdateProductInput
	): Promise<Product> {
		// Check if product exists
		const product = await this.getProductById(id);
		if (!product) {
			throw new ApiError(404, 'Product not found');
		}

		// Check category if provided
		if (data.categoryId) {
			const category = await prisma.productCategory.findFirst({
				where: {
					id: data.categoryId,
					deletedAt: null,
					isActive: true,
				},
			});

			if (!category) {
				throw new ApiError(400, 'Category not found or inactive');
			}
		}

		// If updating name, check for duplicates and update slug
		let slug = product.slug;
		if (data.name && data.name !== product.name) {
			const existingProduct = await prisma.product.findFirst({
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

			if (existingProduct) {
				throw new ApiError(400, 'Product with this name already exists');
			}

			// Generate new slug
			const baseSlug = this.generateSlug(data.name);
			slug = baseSlug;
			let counter = 1;

			while (true) {
				const existingProductBySlug = await prisma.product.findFirst({
					where: {
						slug,
						id: {
							not: id,
						},
						deletedAt: null,
					},
				});

				if (!existingProductBySlug) break;

				slug = `${baseSlug}-${counter}`;
				counter++;
			}
		}

		return await prisma.product.update({
			where: { id },
			data: {
				...(data.name && {
					name: data.name.trim(),
					slug,
				}),
				...(data.description && { description: data.description.trim() }),
				...(data.categoryId && { categoryId: data.categoryId }),
				...(data.price !== undefined && { price: data.price }),
				...(data.weight !== undefined && { weight: data.weight }),
				...(data.picture1 && { picture1: data.picture1 }),
				...(data.picture2 !== undefined && { picture2: data.picture2 }),
				...(data.picture3 !== undefined && { picture3: data.picture3 }),
				...(data.picture4 !== undefined && { picture4: data.picture4 }),
				...(data.isActive !== undefined && { isActive: data.isActive }),
			},
		});
	}

	/**
	 * Delete product (Super Admin only)
	 */
	static async deleteProduct(id: string): Promise<void> {
		// Check if product exists
		const product = await this.getProductById(id);
		if (!product) {
			throw new ApiError(404, 'Product not found');
		}

		// Check if product is in any active carts
		const activeCartItems = await prisma.cartProduct.count({
			where: {
				productId: id,
				cart: {
					deletedAt: null,
				},
				deletedAt: null,
			},
		});

		if (activeCartItems > 0) {
			throw new ApiError(
				400,
				'Cannot delete product. It is currently in customer carts.'
			);
		}

		// Soft delete product and its store stock
		await prisma.$transaction([
			prisma.product.update({
				where: { id },
				data: { deletedAt: new Date() },
			}),
			prisma.storeProduct.updateMany({
				where: { productId: id },
				data: { deletedAt: new Date() },
			}),
		]);
	}

	/**
	 * Toggle product status (Super Admin only)
	 */
	static async toggleProductStatus(id: string): Promise<Product> {
		const product = await this.getProductById(id);
		if (!product) {
			throw new ApiError(404, 'Product not found');
		}

		return await prisma.product.update({
			where: { id },
			data: {
				isActive: !product.isActive,
			},
		});
	}

	/**
	 * Get products by store (for store admin)
	 */
	static async getProductsByStore(
		storeId: string,
		filters: Omit<ProductFilters, 'storeId'> = {},
		page: number = 1,
		limit: number = 20
	) {
		return this.getProducts({ ...filters, storeId }, page, limit);
	}

	/**
	 * Update stock for a product in a specific store
	 */
	static async updateProductStock(
		productId: string,
		storeId: string,
		stock: number
	): Promise<StoreProduct> {
		// Check if product exists and is active
		const product = await this.getProductById(productId);
		if (!product || !product.isActive) {
			throw new ApiError(404, 'Product not found or inactive');
		}

		// Check if store exists
		const store = await prisma.store.findFirst({
			where: {
				id: storeId,
				deletedAt: null,
			},
		});

		if (!store) {
			throw new ApiError(404, 'Store not found');
		}

		// Check if store product already exists
		const existingStoreProduct = await prisma.storeProduct.findFirst({
			where: {
				productId,
				storeId,
				deletedAt: null,
			},
		});

		if (existingStoreProduct) {
			// Update existing stock
			return await prisma.storeProduct.update({
				where: {
					storeId_productId: {
						storeId,
						productId,
					},
				},
				data: {
					stock,
				},
			});
		} else {
			// Create new store product
			return await prisma.storeProduct.create({
				data: {
					productId,
					storeId,
					stock,
				},
			});
		}
	}
}
