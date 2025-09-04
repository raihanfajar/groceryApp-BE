import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../services/product.service';
import { ApiError } from '../utils/ApiError';

interface AuthenticatedRequest extends Request {
	user?: {
		id: string;
		isSuper: boolean;
		storeId?: string;
	};
}

export class ProductController {
	/**
	 * GET /api/products
	 * Get all products with filtering and pagination (public)
	 */
	static async getProducts(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const {
				search,
				categoryId,
				storeId,
				minPrice,
				maxPrice,
				page = 1,
				limit = 20,
			} = req.query;

			const filters = {
				search: search as string,
				categoryId: categoryId as string,
				storeId: storeId as string,
				minPrice: minPrice ? parseInt(minPrice as string) : undefined,
				maxPrice: maxPrice ? parseInt(maxPrice as string) : undefined,
				isActive: true,
			};

			const result = await ProductService.getProducts(
				filters,
				parseInt(page as string),
				parseInt(limit as string)
			);

			res.status(200).json({
				status: 'success',
				data: result,
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * GET /api/products/:id
	 * Get product by ID (public)
	 */
	static async getProductById(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const { id } = req.params;
			const product = await ProductService.getProductById(id);

			if (!product || !product.isActive) {
				throw new ApiError(404, 'Product not found');
			}

			res.status(200).json({
				status: 'success',
				data: {
					product,
				},
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * GET /api/products/slug/:slug
	 * Get product by slug (public)
	 */
	static async getProductBySlug(
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const { slug } = req.params;
			const product = await ProductService.getProductBySlug(slug);

			if (!product) {
				throw new ApiError(404, 'Product not found');
			}

			res.status(200).json({
				status: 'success',
				data: {
					product,
				},
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * GET /api/admin/products
	 * Get all products for admin with filtering and pagination
	 */
	static async getProductsForAdmin(
		req: AuthenticatedRequest,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const {
				search,
				categoryId,
				storeId,
				minPrice,
				maxPrice,
				isActive,
				page = 1,
				limit = 20,
			} = req.query;

			let filters: any = {
				search: search as string,
				categoryId: categoryId as string,
				minPrice: minPrice ? parseInt(minPrice as string) : undefined,
				maxPrice: maxPrice ? parseInt(maxPrice as string) : undefined,
				isActive: isActive !== undefined ? isActive === 'true' : undefined,
			};

			// Store admins can only see products from their store
			if (!req.user?.isSuper && req.user?.storeId) {
				filters = { ...filters, storeId: req.user.storeId };
			} else if (storeId) {
				filters = { ...filters, storeId: storeId as string };
			}

			const result = await ProductService.getProducts(
				filters,
				parseInt(page as string),
				parseInt(limit as string)
			);

			res.status(200).json({
				status: 'success',
				data: result,
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * POST /api/admin/products
	 * Create new product (Super Admin only)
	 */
	static async createProduct(
		req: AuthenticatedRequest,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			if (!req.user?.isSuper) {
				throw new ApiError(403, 'Only Super Admin can create products');
			}

			const {
				name,
				description,
				categoryId,
				price,
				weight,
				picture1,
				picture2,
				picture3,
				picture4,
			} = req.body;

			// Validation
			if (!name || name.trim().length === 0) {
				throw new ApiError(400, 'Product name is required');
			}
			if (!description || description.trim().length === 0) {
				throw new ApiError(400, 'Product description is required');
			}
			if (!categoryId) {
				throw new ApiError(400, 'Category ID is required');
			}
			if (!price || price <= 0) {
				throw new ApiError(400, 'Valid price is required');
			}
			if (!picture1) {
				throw new ApiError(400, 'At least one product picture is required');
			}

			const product = await ProductService.createProduct({
				name: name.trim(),
				description: description.trim(),
				categoryId,
				price: parseInt(price),
				weight: weight ? parseFloat(weight) : undefined,
				picture1,
				picture2,
				picture3,
				picture4,
			});

			res.status(201).json({
				status: 'success',
				message: 'Product created successfully',
				data: {
					product,
				},
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * PUT /api/admin/products/:id
	 * Update product (Super Admin only)
	 */
	static async updateProduct(
		req: AuthenticatedRequest,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			if (!req.user?.isSuper) {
				throw new ApiError(403, 'Only Super Admin can update products');
			}

			const { id } = req.params;
			const {
				name,
				description,
				categoryId,
				price,
				weight,
				picture1,
				picture2,
				picture3,
				picture4,
				isActive,
			} = req.body;

			const updateData: any = {};
			if (name !== undefined) updateData.name = name.trim();
			if (description !== undefined)
				updateData.description = description.trim();
			if (categoryId !== undefined) updateData.categoryId = categoryId;
			if (price !== undefined) updateData.price = parseInt(price);
			if (weight !== undefined) updateData.weight = parseFloat(weight);
			if (picture1 !== undefined) updateData.picture1 = picture1;
			if (picture2 !== undefined) updateData.picture2 = picture2;
			if (picture3 !== undefined) updateData.picture3 = picture3;
			if (picture4 !== undefined) updateData.picture4 = picture4;
			if (isActive !== undefined) updateData.isActive = isActive;

			const product = await ProductService.updateProduct(id, updateData);

			res.status(200).json({
				status: 'success',
				message: 'Product updated successfully',
				data: {
					product,
				},
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * DELETE /api/admin/products/:id
	 * Delete product (Super Admin only)
	 */
	static async deleteProduct(
		req: AuthenticatedRequest,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			if (!req.user?.isSuper) {
				throw new ApiError(403, 'Only Super Admin can delete products');
			}

			const { id } = req.params;
			await ProductService.deleteProduct(id);

			res.status(200).json({
				status: 'success',
				message: 'Product deleted successfully',
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * PATCH /api/admin/products/:id/toggle-status
	 * Toggle product status (Super Admin only)
	 */
	static async toggleProductStatus(
		req: AuthenticatedRequest,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			if (!req.user?.isSuper) {
				throw new ApiError(403, 'Only Super Admin can toggle product status');
			}

			const { id } = req.params;
			const product = await ProductService.toggleProductStatus(id);

			res.status(200).json({
				status: 'success',
				message: `Product ${product.isActive ? 'activated' : 'deactivated'} successfully`,
				data: {
					product,
				},
			});
		} catch (error) {
			next(error);
		}
	}

	/**
	 * PUT /api/admin/products/:id/stock
	 * Update product stock for a specific store
	 */
	static async updateProductStock(
		req: AuthenticatedRequest,
		res: Response,
		next: NextFunction
	): Promise<void> {
		try {
			const { id: productId } = req.params;
			const { storeId, stock } = req.body;

			// Store admins can only update stock for their own store
			let targetStoreId = storeId;
			if (!req.user?.isSuper) {
				if (!req.user?.storeId) {
					throw new ApiError(403, 'Store admin must be assigned to a store');
				}
				targetStoreId = req.user.storeId;
			}

			if (!targetStoreId) {
				throw new ApiError(400, 'Store ID is required');
			}

			if (stock === undefined || stock < 0) {
				throw new ApiError(400, 'Valid stock amount is required');
			}

			const storeProduct = await ProductService.updateProductStock(
				productId,
				targetStoreId,
				parseInt(stock)
			);

			res.status(200).json({
				status: 'success',
				message: 'Product stock updated successfully',
				data: {
					storeProduct,
				},
			});
		} catch (error) {
			next(error);
		}
	}
}
