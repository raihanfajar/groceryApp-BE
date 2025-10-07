import { addDays, addHours, format } from "date-fns";
import { Prisma, OrderStatus } from "../generated/prisma";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";
import { cloudinaryUpload } from "../utils/cloudinary";
import { CartProductWithDetails } from "../types/cartProduct";
import { coreApi, snap } from "../lib/midtrans";
import {
	MidtransFraudStatus,
	MidtransNotificationPayload,
	MidtransTransactionStatus,
} from "../types/midTrans";
import {
	sendOrderConfirmationEmail,
	sendOrderShippedEmail,
	sendPaymentConfirmedEmail,
} from "../lib/transactionMailer";

type CalculatedProductDetail = {
	cartProductId: string;
	productId: string;
	quantity: number;
	originalPrice: number;
	appliedDiscount: number;
	priceAfterDiscount: number;
};

type PriceCalculationResult = {
	productDetails: CalculatedProductDetail[];
	totalPriceAfterDiscount: number; // Ini adalah total harga produk setelah diskon per-item
};

export class TransactionService {
	async getUserAddress(userId: string) {
		const address = await prisma.userAddress.findMany({
			where: { userId: userId },
		});
		if (!address) throw new ApiError(404, "User Address not found");
		return address;
	}

	async calculateShippingPrice(
		userId: string,
		userAddressId: string,
		storeId: string
	) {
		const [cart, store, userAddress] = await Promise.all([
			prisma.cart.findUnique({ where: { userId } }),
			prisma.store.findUnique({ where: { id: storeId } }),
			prisma.userAddress.findUnique({ where: { id: userAddressId } }),
		]);

		if (!cart) throw new ApiError(404, "Cart not found");
		if (!store) throw new ApiError(404, "Store not found");
		if (!userAddress) throw new ApiError(404, "User address not found");

		const cartItems = await prisma.cartProduct.findMany({
			where: { cartId: cart.id },
			include: { product: true },
		});
		if (cartItems.length === 0) throw new ApiError(400, "Cart is empty");

		const { inStockItems } = await this._filterStock(cartItems, storeId);
		if (inStockItems.length === 0) {
			throw new ApiError(400, "All products in the cart are out of stock.");
		}

		let totalWeight = 0;
		for (const item of inStockItems) {
			const itemWeight = item.product.weight || 0;
			totalWeight += itemWeight * item.quantity;
		}
		if (totalWeight === 0) {
			return { price: 10000 };
		}

		const params = new URLSearchParams({
			origin: userAddress.districtId.toString(),
			destination: store.districtId.toString(),
			weight: totalWeight.toString(),
			courier: "jne:sicepat:jnt",
		});

		const response = await fetch(
			"https://rajaongkir.komerce.id/api/v1/calculate/district/domestic-cost",
			{
				method: "POST",
				headers: {
					key: process.env.RAJAONGKIR_API_KEY!,
					"content-type": "application/x-www-form-urlencoded",
				},
				body: params,
			}
		);

		if (!response.ok) {
			throw new ApiError(500, `RajaOngkir API request failed`);
		}

		const jsonResponse = (await response.json()) as {
			meta?: { status: string; message?: string };
			data?: { cost: number }[];
		};

		if (jsonResponse.meta?.status !== "success") {
			throw new ApiError(
				400,
				jsonResponse.meta?.message || "RajaOngkir returned an error."
			);
		}

		const shippingOptions = jsonResponse.data;

		if (!shippingOptions || shippingOptions.length === 0) {
			throw new ApiError(404, "No shipping options found.");
		}

		let lowestPrice = Infinity;
		for (const option of shippingOptions) {
			if (option.cost < lowestPrice) {
				lowestPrice = option.cost;
			}
		}

		if (lowestPrice === Infinity) {
			throw new ApiError(404, "Shipping cost could not be determined.");
		}

		return { price: lowestPrice };
	}

	async createUserTransaction(
		userId: string,
		userAddressId: string,
		storeId: string,
		shippingPrice: number,
		paymentMethod: "manual_transfer" | "midtrans",
		codeVoucherProduct?: string,
		codeVoucherDelivery?: string
	) {
		const [cart, user, userAddress] = await Promise.all([
			prisma.cart.findUnique({ where: { userId } }),
			prisma.users.findUnique({ where: { id: userId } }),
			prisma.userAddress.findUnique({ where: { id: userAddressId } }),
		]);
		if (!cart) throw new ApiError(404, "Cart not found");
		if (!user) throw new ApiError(404, "User not found");
		if (!userAddress) throw new ApiError(404, "User address not found");

		const cartProducts = await prisma.cartProduct.findMany({
			where: { cartId: cart.id },
			include: { product: true },
		});
		if (cartProducts.length === 0) throw new ApiError(400, "Cart is empty");

		let validVoucherProduct = null;
		if (codeVoucherProduct) {
			validVoucherProduct = await prisma.voucherProduct.findUnique({
				where: { code: codeVoucherProduct },
			});
			if (
				!validVoucherProduct ||
				validVoucherProduct.quota <= 0 ||
				new Date() > validVoucherProduct.expiredDate
			) {
				throw new ApiError(400, "Product voucher is not valid.");
			}
		}
		if (!paymentMethod) throw new ApiError(400, "Payment method is required.");
		let validVoucherDelivery = null;
		if (codeVoucherDelivery) {
			validVoucherDelivery = await prisma.voucherDelivery.findUnique({
				where: { code: codeVoucherDelivery },
			});
			if (
				!validVoucherDelivery ||
				validVoucherDelivery.quota <= 0 ||
				new Date() > validVoucherDelivery.expiredDate
			) {
				throw new ApiError(400, "Delivery voucher is not valid.");
			}
		}

		const { inStockItems, outOfStockItems } = await this._filterStock(
			cartProducts,
			storeId
		);
		if (inStockItems.length === 0) {
			throw new ApiError(400, "All products in the cart are out of stock.");
		}

		const transactionResult = await prisma.$transaction(async (tx) => {
			const priceDetails = await this._calculatePricesAndDiscounts(
				inStockItems,
				userId,
				tx
			);

			const totalProductPrice = priceDetails.totalPriceAfterDiscount;

			let productVoucherDiscount = 0;
			if (validVoucherProduct) {
				productVoucherDiscount = Math.min(
					totalProductPrice,
					validVoucherProduct.maxDiscount
				);
			}
			const discountedProductPrice = productVoucherDiscount;
			const finalProductPrice = totalProductPrice - discountedProductPrice;

			let deliveryVoucherDiscount = 0;
			if (validVoucherDelivery) {
				deliveryVoucherDiscount = Math.min(
					shippingPrice,
					validVoucherDelivery.maxDiscount
				);
			}
			const finalShippingPrice = shippingPrice - deliveryVoucherDiscount;
			const grandTotalPrice = finalProductPrice + finalShippingPrice;

			let newTransaction = await tx.transaction.create({
				data: {
					userId,
					storeId,
					shippingPrice,
					paymentMethod,
					receiverName: userAddress.receiverName,
					totalProductPrice: totalProductPrice,
					discountedProductPrice: discountedProductPrice,
					finalProductPrice: finalProductPrice,
					discountedShipping: deliveryVoucherDiscount,
					finalShippingPrice,
					totalPrice: grandTotalPrice,
					address: userAddress.addressDetails,
					phoneNumber: userAddress.receiverPhoneNumber,
					provinceId: userAddress.provinceId,
					province: userAddress.province,
					cityId: userAddress.cityId,
					city: userAddress.city,
					district: userAddress.district,
					districtId: userAddress.districtId,
					addressLabel: userAddress.addressLabel,
					status: "waiting_payment",
					expiryAt: addHours(new Date(), 2),
					codeVoucherProduct,
					codeVoucherDelivery,
				},
			});

			if (paymentMethod === "midtrans") {
				const startTime = format(new Date(), "yyyy-MM-dd HH:mm:ss xx");

				const finishRedirectUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/transaction/${newTransaction.id}`;

				const parameters = {
					transaction_details: {
						order_id: newTransaction.id,
						gross_amount: grandTotalPrice,
					},
					customer_details: {
						first_name: user!.name,
						email: user!.email,
						phone: userAddress!.receiverPhoneNumber,
					},
					expiry: {
						start_time: startTime,
						unit: "hours",
						duration: 2,
					},
					callbacks: {
						finish: finishRedirectUrl,
					},
				};
				const snapToken = await snap.createTransaction(parameters);
				newTransaction = await tx.transaction.update({
					where: { id: newTransaction.id },
					data: {
						snapToken: snapToken.token,
						snapRedirectUrl: snapToken.redirect_url,
					},
				});
			}

			const transactionProductsData = priceDetails.productDetails.map((p) => ({
				transactionId: newTransaction.id,
				productId: p.productId,
				quantity: p.quantity,
				price: p.originalPrice,
				discount: p.appliedDiscount,
				finalPrice: p.priceAfterDiscount,
			}));
			await tx.transactionProduct.createMany({ data: transactionProductsData });

			await Promise.all(
				priceDetails.productDetails.map((p) =>
					tx.storeProduct.update({
						where: { storeId_productId: { storeId, productId: p.productId } },
						data: { stock: { decrement: p.quantity } },
					})
				)
			);

			if (validVoucherProduct) {
				await tx.voucherProduct.update({
					where: { code: codeVoucherProduct },
					data: { quota: { decrement: 1 } },
				});
			}
			if (validVoucherDelivery) {
				await tx.voucherDelivery.update({
					where: { code: codeVoucherDelivery },
					data: { quota: { decrement: 1 } },
				});
			}

			const inStockCartProductIds = priceDetails.productDetails.map(
				(p) => p.cartProductId
			);
			await tx.cartProduct.deleteMany({
				where: { id: { in: inStockCartProductIds } },
			});

			return newTransaction;
		});

		await sendOrderConfirmationEmail(user, transactionResult);

		return {
			transaction: transactionResult,
			outOfStockItems,
			paymentDetails: transactionResult.snapToken
				? {
						token: transactionResult.snapToken,
						redirect_url: transactionResult.snapRedirectUrl,
					}
				: null,
		};
	}

	private async _filterStock(
		cartProducts: CartProductWithDetails[],
		storeId: string
	) {
		const productIds = cartProducts.map((p) => p.productId);
		const stocks = await prisma.storeProduct.findMany({
			where: { storeId: storeId, productId: { in: productIds } },
		});
		const stockMap = new Map(stocks.map((s) => [s.productId, s.stock]));

		const inStockItems: CartProductWithDetails[] = [];
		const outOfStockItems: CartProductWithDetails[] = [];
		for (const item of cartProducts) {
			const availableStock = stockMap.get(item.productId) || 0;
			if (availableStock >= item.quantity) {
				inStockItems.push(item);
			} else {
				outOfStockItems.push(item);
			}
		}
		return { inStockItems, outOfStockItems };
	}

	private async _calculatePricesAndDiscounts(
		cartProducts: CartProductWithDetails[],
		userId: string,
		tx: Prisma.TransactionClient
	): Promise<PriceCalculationResult> {
		const now = new Date();
		const storeIds = [...new Set(cartProducts.map((p) => p.storeId))];
		const subTotal = cartProducts.reduce(
			(sum, p) => sum + p.product.price * p.quantity,
			0
		);

		const productQuantityMap = new Map<string, number>();
		for (const item of cartProducts) {
			const currentQty = productQuantityMap.get(item.productId) || 0;
			productQuantityMap.set(item.productId, currentQty + item.quantity);
		}

		const potentialDiscounts = await tx.discount.findMany({
			where: {
				isActive: true,
				startDate: { lte: now },
				endDate: { gte: now },
				OR: [{ storeId: { in: storeIds } }, { storeId: null }],
			},
			include: { products: true, bogoConfig: true },
		});

		const discountIds = potentialDiscounts.map((d) => d.id);
		const userUsageCounts = await tx.discountUsageHistory.groupBy({
			by: ["discountId"],
			where: { userId: userId, discountId: { in: discountIds } },
			_count: { id: true },
		});
		const usageMap = new Map<string, number>();
		for (const usage of userUsageCounts) {
			usageMap.set(usage.discountId, usage._count.id);
		}

		let totalPriceAfterDiscount = 0;
		const productDetails: CalculatedProductDetail[] = [];

		for (const item of cartProducts) {
			const itemPrice = item.product.price;
			let bestDiscountAmount = 0;

			const candidateDiscounts = potentialDiscounts.filter((d) => {
				if (d.storeId === null) {
					return (
						d.products.length === 0 ||
						d.products.some((p) => p.productId === item.productId)
					);
				} else if (d.storeId === item.storeId) {
					return (
						d.products.length === 0 ||
						d.products.some((p) => p.productId === item.productId)
					);
				}
				return false;
			});

			for (const discountForProduct of candidateDiscounts) {
				const isMinimumPurchaseMet =
					!discountForProduct.minTransactionValue ||
					subTotal >= discountForProduct.minTransactionValue;
				const usageCount = usageMap.get(discountForProduct.id) || 0;
				const isUsageLimitOk =
					!discountForProduct.maxUsagePerCustomer ||
					usageCount < discountForProduct.maxUsagePerCustomer;

				let currentDiscountAmount = 0;
				if (isMinimumPurchaseMet && isUsageLimitOk) {
					if (
						discountForProduct.type === "BOGO" &&
						discountForProduct.bogoConfig
					) {
						const totalQuantityForProduct =
							productQuantityMap.get(item.productId) || 0;
						const { buyQuantity, getQuantity, maxBogoSets } =
							discountForProduct.bogoConfig;
						const totalRequiredItems = buyQuantity + getQuantity;

						if (totalQuantityForProduct >= totalRequiredItems) {
							const maxPossibleSets = Math.floor(
								totalQuantityForProduct / totalRequiredItems
							);
							const actualSets = maxBogoSets
								? Math.min(maxPossibleSets, maxBogoSets)
								: maxPossibleSets;
							const freeItemsCount = actualSets * getQuantity;

							const discountPerUnit =
								(itemPrice * freeItemsCount) / totalQuantityForProduct;
							currentDiscountAmount = discountPerUnit * item.quantity;
						}
					} else if (discountForProduct.valueType === "PERCENTAGE") {
						currentDiscountAmount = Math.floor(
							itemPrice * (discountForProduct.value / 100)
						);
						if (discountForProduct.maxDiscountAmount) {
							currentDiscountAmount = Math.min(
								currentDiscountAmount,
								discountForProduct.maxDiscountAmount
							);
						}
					} else if (discountForProduct.valueType === "NOMINAL") {
						currentDiscountAmount = discountForProduct.value;
					}
				}

				if (currentDiscountAmount > bestDiscountAmount) {
					bestDiscountAmount = currentDiscountAmount;
				}
			}

			const finalItemPrice = itemPrice - bestDiscountAmount;
			productDetails.push({
				cartProductId: item.id,
				productId: item.productId,
				quantity: item.quantity,
				originalPrice: itemPrice,
				appliedDiscount: bestDiscountAmount,
				priceAfterDiscount: finalItemPrice,
			});
			totalPriceAfterDiscount += finalItemPrice * item.quantity;
		}

		return { productDetails, totalPriceAfterDiscount };
	}

	async handleMidtransNotification(notification: MidtransNotificationPayload) {
		try {
			const statusResponse = await (coreApi as any).transaction.notification(
				notification
			);

			const orderId = statusResponse.order_id as string;
			const transactionStatus =
				statusResponse.transaction_status as MidtransTransactionStatus;
			const fraudStatus = (statusResponse.fraud_status ??
				null) as MidtransFraudStatus | null;
			const grossAmount = Math.round(
				parseFloat(statusResponse.gross_amount || "0")
			);

			const trx = await prisma.transaction.findUnique({
				where: { id: orderId },
				include: { user: true },
			});

			if (
				!trx ||
				trx.status === "completed" ||
				trx.status === "cancelled" ||
				trx.totalPrice !== grossAmount
			) {
				return;
			}

			let newStatus: OrderStatus | null = null;
			switch (transactionStatus) {
				case "capture":
					if (fraudStatus === "accept") newStatus = OrderStatus.on_process;
					else if (fraudStatus === "challenge")
						newStatus = OrderStatus.waiting_confirmation;
					else if (fraudStatus === "deny") newStatus = OrderStatus.cancelled;
					break;
				case "settlement":
					newStatus = OrderStatus.on_process;
					break;
				case "pending":
					newStatus = OrderStatus.waiting_payment;
					break;
				case "deny":
				case "cancel":
				case "expire":
				case "failure":
					newStatus = OrderStatus.cancelled;
					break;
			}

			if (newStatus && newStatus !== trx.status) {
				const updateData: Prisma.TransactionUpdateInput = {
					status: newStatus,
				};

				if (newStatus === OrderStatus.on_process) {
					updateData.paidAt = new Date();

					const updatedTransaction = await prisma.transaction.update({
						where: { id: orderId },
						data: updateData,
					});

					if (trx.user) {
						await sendPaymentConfirmedEmail(trx.user, updatedTransaction);
					}
				} else {
					await prisma.transaction.update({
						where: { id: orderId },
						data: updateData,
					});
				}
			}

			return;
		} catch (err: any) {
			throw new ApiError(400, err.message || "Invalid Midtrans notification");
		}
	}

	async uploadPaymentProof(
		userId: string,
		file: Express.Multer.File,
		transactionId: string
	) {
		prisma.$transaction(async (tx) => {
			const transaction = await tx.transaction.findFirst({
				where: {
					id: transactionId,
					userId: userId,
				},
			});
			if (!transaction) throw new ApiError(404, "Transaction not found");
			if (!transaction || transaction.status !== "waiting_payment") {
				throw new Error(
					"Transaction must be ont waiting payment status to upload payment proof."
				);
			}

			const uploadedFile = await cloudinaryUpload(file.buffer);

			if (!uploadedFile || !uploadedFile.secure_url) {
				throw new Error("File upload to Cloudinary failed.");
			}
			const updatedTransaction = await tx.transaction.update({
				where: { id: transactionId },
				data: {
					status: "waiting_confirmation",
					paymentProof: uploadedFile.url,
					expiryAt: addDays(new Date(), 2),
				},
			});
			return updatedTransaction;
		});
	}

	async getUserTransactions(
		userId: string,
		opts?: {
			status?: OrderStatus;
			orderId?: string;
			startDate?: Date;
			endDate?: Date;
			page?: number;
			pageSize?: number;
		}
	) {
		const {
			status,
			orderId,
			startDate,
			endDate,
			page = 1,
			pageSize = 5,
		} = opts ?? {};
		const safePageSize = Math.min(Math.max(pageSize, 1), 100);
		const skip = (Math.max(page, 1) - 1) * safePageSize;

		const whereCondition: Prisma.TransactionWhereInput = { userId };

		if (status) whereCondition.status = status;
		if (orderId) whereCondition.id = orderId;

		if (startDate || endDate) {
			if (startDate) {
				const s = new Date(startDate);
				s.setHours(0, 0, 0, 0);
				whereCondition.createdAt = {
					...(whereCondition.createdAt as any),
					gte: s,
				};
			}
			if (endDate) {
				const e = new Date(endDate);
				e.setHours(23, 59, 59, 999);
				whereCondition.createdAt = {
					...(whereCondition.createdAt as any),
					lte: e,
				};
			}
		}

		const [transactions, total] = await Promise.all([
			prisma.transaction.findMany({
				where: whereCondition,
				include: {
					products: { include: { product: true } },
				},
				orderBy: { createdAt: "desc" },
				skip,
				take: safePageSize,
			}),
			prisma.transaction.count({ where: whereCondition }),
		]);

		const totalPages = Math.ceil(total / safePageSize);

		return {
			data: transactions,
			meta: {
				total,
				page: Math.max(page, 1),
				pageSize: safePageSize,
				totalPages,
				hasNext: page < totalPages,
			},
		};
	}

	async getUserTransactionDetail(userId: string, transactionId: string) {
		const transaction = await prisma.transaction.findFirst({
			where: {
				id: transactionId,
				userId: userId,
			},
			include: {
				products: {
					include: {
						product: true,
					},
				},
			},
		});
		if (!transaction) throw new ApiError(404, "Transaction not found");
		return transaction;
	}

	async completeUserTransaction(userId: string, transactionId: string) {
		const transaction = await prisma.transaction.findFirst({
			where: {
				id: transactionId,
				userId: userId,
			},
		});
		if (!transaction) throw new ApiError(404, "Transaction not found");
		if (transaction.status !== "shipped")
			throw new ApiError(
				400,
				"Transaction can only be completed if is in waiting confirmation status"
			);
		const completedTransaction = await prisma.transaction.update({
			where: { id: transactionId },
			data: {
				status: "completed",
				expiryAt: null,
			},
		});
		return completedTransaction;
	}

	async cancelUserTransaction(userId: string, transactionId: string) {
		const transaction = await prisma.transaction.findUnique({
			where: { id: transactionId },
			include: { products: true },
		});

		if (!transaction) {
			throw new ApiError(404, "Transaction not found");
		}

		if (transaction.userId !== userId) {
			throw new ApiError(
				403,
				"You are not authorized to cancel this transaction"
			);
		}

		if (transaction.status !== "waiting_payment") {
			throw new ApiError(
				400,
				"Transaction can only be canceled if is not in waiting payment status"
			);
		}

		const canceledTransaction = await prisma.$transaction(async (tx) => {
			for (const product of transaction.products) {
				await tx.storeProduct.update({
					where: {
						storeId_productId: {
							storeId: transaction.storeId,
							productId: product.productId,
						},
					},
					data: {
						stock: {
							increment: product.quantity,
						},
					},
				});
			}
			await tx.transaction.update({
				where: { id: transactionId },
				data: {
					status: "cancelled",
					expiryAt: null,
				},
			});
		});

		return canceledTransaction;
	}

	// Admin transaction Actions
	async getStoreTransactions(
		adminId: string,
		opts?: {
			status?: OrderStatus;
			orderId?: string;
			startDate?: Date;
			endDate?: Date;
			page?: number;
			pageSize?: number;
			storeId?: string;
		}
	) {
		const {
			status,
			orderId,
			startDate,
			endDate,
			page = 1,
			pageSize = 5,
			storeId: filterStoreId,
		} = opts ?? {};

		let resolvedStoreId = filterStoreId;

		if (!resolvedStoreId) {
			const admin = await prisma.admin.findUnique({
				where: { id: adminId },
				select: { storeId: true, isSuper: true },
			});

			if (!admin) {
				throw new ApiError(404, "Admin not found");
			}

			if (!admin.isSuper) {
				if (!admin.storeId) {
					throw new ApiError(404, "Admin has no store assigned");
				}
				resolvedStoreId = admin.storeId;
			}
		}

		const safePageSize = Math.min(Math.max(pageSize, 1), 100);
		const safePage = Math.max(page, 1);
		const skip = (safePage - 1) * safePageSize;

		const whereCondition: Prisma.TransactionWhereInput = {};

		if (resolvedStoreId) {
			whereCondition.storeId = resolvedStoreId;
		}
		if (status) whereCondition.status = status;
		if (orderId) whereCondition.id = orderId;

		if (startDate || endDate) {
			whereCondition.createdAt = {};
			if (startDate) {
				const s = new Date(startDate);
				s.setHours(0, 0, 0, 0);
				whereCondition.createdAt.gte = s;
			}
			if (endDate) {
				const e = new Date(endDate);
				e.setHours(23, 59, 59, 999);
				whereCondition.createdAt.lte = e;
			}
		}

		const [transactions, total] = await Promise.all([
			prisma.transaction.findMany({
				where: whereCondition,
				include: {
					user: {
						select: {
							id: true,
							name: true,
							email: true,
							profilePicture: true,
						},
					},
					store: {
						select: {
							id: true,
							name: true,
						},
					},
					products: {
						include: {
							product: {
								select: {
									id: true,
									name: true,
									picture1: true,
								},
							},
						},
					},
				},
				orderBy: { createdAt: "desc" },
				skip,
				take: safePageSize,
			}),
			prisma.transaction.count({ where: whereCondition }),
		]);
		const totalPages = Math.ceil(total / safePageSize);

		return {
			data: transactions,
			meta: {
				total,
				page: safePage,
				pageSize: safePageSize,
				totalPages,
				hasNext: safePage < totalPages,
			},
		};
	}

	// Confirming order transaction
	async confirmingOrderTransaction(transactionId: string) {
		const transaction = await prisma.transaction.findFirst({
			where: { id: transactionId, status: "waiting_confirmation" },
			include: { products: true },
		});
		if (!transaction) throw new ApiError(404, "Transaction not found");
		const confirm = await prisma.transaction.update({
			where: { id: transactionId },
			data: {
				status: "on_process",
			},
		});

		const updatedTransaction = await prisma.transaction.update({
			where: { id: transactionId },
			data: { status: "on_process", paidAt: new Date() },
		});

		const transactionWithUser = await prisma.transaction.findUnique({
			where: { id: transactionId },
			include: { user: true },
		});
		if (transactionWithUser) {
			await sendPaymentConfirmedEmail(
				transactionWithUser.user,
				updatedTransaction
			);
		}
		return confirm;
	}

	// Cancel order Payment
	async cancelOrderPayment(transactionId: string) {
		const transaction = await prisma.transaction.findFirst({
			where: { id: transactionId, status: "waiting_confirmation" },
			include: { products: true },
		});
		if (!transaction) throw new ApiError(404, "Transaction not found");
		const cancel = await prisma.transaction.update({
			where: { id: transactionId },
			data: {
				status: "waiting_payment",
				expiryAt: addDays(new Date(), 7),
			},
		});
		return cancel;
	}

	async shippingTransaction(transactionId: string) {
		const transaction = await prisma.transaction.findUnique({
			where: { id: transactionId },
			include: { products: true },
		});

		if (!transaction) {
			throw new ApiError(404, "Transaction not found");
		}

		const shippedTransaction = await prisma.transaction.update({
			where: { id: transactionId },
			data: {
				status: "shipped",
				expiryAt: addDays(new Date(), 7),
			},
		});

		const transactionWithUser = await prisma.transaction.findUnique({
			where: { id: transactionId },
			include: { user: true },
		});

		if (transactionWithUser) {
			await sendOrderShippedEmail(transactionWithUser.user, shippedTransaction);
		}

		return shippedTransaction;
	}

	async cancelStoreTransaction(transactionId: string) {
		const transaction = await prisma.transaction.findUnique({
			where: { id: transactionId },
			include: { products: true },
		});

		if (!transaction) {
			throw new ApiError(404, "Transaction not found");
		}

		const canceledTransaction = await prisma.$transaction(async (tx) => {
			for (const product of transaction.products) {
				await tx.storeProduct.update({
					where: {
						storeId_productId: {
							storeId: transaction.storeId,
							productId: product.productId,
						},
					},
					data: {
						stock: {
							increment: product.quantity,
						},
					},
				});
			}
			await tx.transaction.update({
				where: { id: transactionId },
				data: {
					status: "cancelled",
					expiryAt: null,
				},
			});
		});

		return canceledTransaction;
	}

	// Get all store list
	async getAllStoreList(userId: string) {
		const admin = await prisma.admin.findFirst({
			where: { id: userId },
		});
		if (!admin?.isSuper) {
			throw new ApiError(403, "Only super admin can access this route");
		}

		const stores = await prisma.store.findMany({
			where: { deletedAt: null },
			select: {
				id: true,
				name: true,
			},
		});

		return stores;
	}
}
