import { addDays, addHours } from "date-fns";
import { Prisma, OrderStatus } from "../generated/prisma";
import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";
import { cloudinaryUpload } from "../utils/cloudinary";
import { CartProductWithDetails } from "../types/cartProduct";
import { coreApi, snap } from "../lib/midtrans";
import {
	MidtransCoreApi,
	MidtransFraudStatus,
	MidtransNotificationPayload,
	MidtransTransactionStatus,
} from "../types/midTrans";
import { computeMidtransSignature } from "../utils/computeMidtransSignature";
import {
	sendOrderConfirmationEmail,
	sendOrderShippedEmail,
	sendPaymentConfirmedEmail,
} from "../lib/transactionMailer";

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
		if (totalWeight === 0) throw new ApiError(400, "Total weight is zero.");

		const params = new URLSearchParams();
		params.append("origin", userAddress.districtId.toString()); 
		params.append("destination", store.cityId.toString()); 
		params.append("weight", totalWeight.toString());
		params.append("courier", "jne"); 

		const response = await fetch("https://api.rajaongkir.com/starter/cost", {
			method: "POST",
			headers: {
				key: process.env.RAJAONGKIR_API_KEY!,
				"content-type": "application/x-www-form-urlencoded",
			},
			body: params,
		});

		if (!response.ok) {
			throw new Error(
				`RajaOngkir API request failed with status ${response.status}`
			);
		}

		const jsonResponse = await response.json();
		const results = jsonResponse.rajaongkir.results[0]?.costs;

		if (!results || results.length === 0) {
			throw new ApiError(404, "No shipping options found.");
		}

		let lowestPrice = Infinity;
		for (const service of results) {
			if (service.cost && service.cost[0]?.value < lowestPrice) {
				lowestPrice = service.cost[0].value;
			}
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

			let productVoucherDiscount = 0;
			if (validVoucherProduct) {
				productVoucherDiscount = Math.min(
					priceDetails.totalPriceAfterDiscount,
					validVoucherProduct.maxDiscount
				);
			}
			let deliveryVoucherDiscount = 0;
			if (validVoucherDelivery) {
				deliveryVoucherDiscount = Math.min(
					shippingPrice,
					validVoucherDelivery.maxDiscount
				);
			}

			const finalProductPrice =
				priceDetails.totalPriceAfterDiscount - productVoucherDiscount;
			const finalShippingPrice = shippingPrice - deliveryVoucherDiscount;
			const grandTotalPrice = finalProductPrice + finalShippingPrice;

			let newTransaction = await tx.transaction.create({
				data: {
					userId,
					storeId,
					shippingPrice,
					paymentMethod,
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
					status: "waiting_payment",
					expiryAt:
						paymentMethod === "manual_transfer"
							? addHours(new Date(), 2)
							: null,
					codeVoucherProduct,
					codeVoucherDelivery,
				},
			});

			if (paymentMethod === "midtrans") {
				const parameters = {
					transaction_details: {
						order_id: newTransaction.id,
						gross_amount: grandTotalPrice,
					},
					customer_details: {
						first_name: user.name,
						email: user.email,
						phone: userAddress.receiverPhoneNumber,
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
	) {
		const productIds = cartProducts.map((p) => p.productId);
		const subTotal = cartProducts.reduce(
			(sum, p) => sum + p.product.price * p.quantity,
			0
		);

		// Ambil semua diskon yang berpotensi valid
		const potentialDiscounts = await tx.discount.findMany({
			where: {
				isActive: true,
				startDate: { lte: new Date() },
				endDate: { gte: new Date() },
				products: { some: { productId: { in: productIds } } },
			},
			include: { products: true },
		});

		const discountIds = potentialDiscounts.map((d) => d.id);
		const userUsageCounts = await tx.discountUsageHistory.groupBy({
			by: ["discountId"],
			where: {
				userId: userId,
				discountId: { in: discountIds },
			},
			_count: { id: true },
		});

		const usageMap = new Map<string, number>();
		for (const usage of userUsageCounts) {
			usageMap.set(usage.discountId, usage._count.id);
		}

		let totalPriceAfterDiscount = 0;
		const productDetails = [];

		for (const item of cartProducts) {
			let itemPrice = item.product.price;
			let appliedDiscount = 0;

			const discountForProduct = potentialDiscounts.find((d) =>
				d.products.some((p) => p.productId === item.productId)
			);

			if (discountForProduct) {
				// --- VALIDASI GABUNGAN ---
				// Cek 1: Syarat minimum belanja
				const isMinimumPurchaseMet =
					!discountForProduct.minTransactionValue ||
					subTotal >= discountForProduct.minTransactionValue;

				// Cek 2: Batas penggunaan per pelanggan
				const usageCount = usageMap.get(discountForProduct.id) || 0;
				const isUsageLimitOk =
					!discountForProduct.maxUsagePerCustomer ||
					usageCount < discountForProduct.maxUsagePerCustomer;

				// Hanya terapkan diskon jika SEMUA syarat terpenuhi
				if (isMinimumPurchaseMet && isUsageLimitOk) {
					if (discountForProduct.valueType === "PERCENTAGE") {
						appliedDiscount = Math.floor(
							itemPrice * (discountForProduct.value / 100)
						);
						if (discountForProduct.maxDiscountAmount) {
							appliedDiscount = Math.min(
								appliedDiscount,
								discountForProduct.maxDiscountAmount
							);
						}
					} else if (discountForProduct.valueType === "NOMINAL") {
						appliedDiscount = discountForProduct.value;
					}
				}
			}

			const finalItemPrice = itemPrice - appliedDiscount;
			const finalTotalPriceForItem = finalItemPrice * item.quantity;

			productDetails.push({
				cartProductId: item.id,
				productId: item.productId,
				quantity: item.quantity,
				originalPrice: itemPrice,
				appliedDiscount,
				priceAfterDiscount: finalItemPrice,
			});

			totalPriceAfterDiscount += finalTotalPriceForItem;
		}

		return { productDetails, totalPriceAfterDiscount };
	}

	async handleMidtransNotification(notification: MidtransNotificationPayload) {
		try {
			const typedCoreApi = coreApi as unknown as MidtransCoreApi;

			// 0. cek MIDTRANS_SERVER_KEY
			const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY ?? "";
			if (!MIDTRANS_SERVER_KEY) {
				throw new Error("MIDTRANS_SERVER_KEY not configured");
			}

			// 1. validasi signature_key dari payload (segera tolak jika mismatch)
			const incomingSignature = (notification.signature_key ?? "") as string;
			const incomingOrderId = notification.order_id;
			const incomingStatusCode = (notification.status_code ?? "") as string;
			const incomingGrossAmount = notification.gross_amount ?? "";

			const expectedSignature = computeMidtransSignature({
				orderId: incomingOrderId,
				statusCode: incomingStatusCode,
				grossAmount: incomingGrossAmount,
				serverKey: MIDTRANS_SERVER_KEY,
			});

			if (incomingSignature !== expectedSignature) {
				// signature mismatch -> hentikan proses (caller webhook bisa return 4xx)
				throw new Error("Invalid Midtrans signature_key");
			}

			// 2. verifikasi ke Core API Midtrans
			const statusResponse = await typedCoreApi.transaction.notification(
				notification as unknown
			);

			const orderId = statusResponse.order_id as string;
			const transactionStatus =
				statusResponse.transaction_status as MidtransTransactionStatus;
			const fraudStatus = (statusResponse.fraud_status ??
				null) as MidtransFraudStatus | null;
			const grossAmount = Math.round(
				parseFloat(statusResponse.gross_amount || "0")
			);

			// 3. ambil trx dari DB
			const trx = await prisma.transaction.findUnique({
				where: { id: orderId },
			});

			if (!trx) {
				console.warn(`[Webhook] Transaction not found: ${orderId}`);
				return;
			}

			// 4. jika sudah final, ignore
			if (trx.status === "completed" || trx.status === "cancelled") {
				return;
			}

			// 5. validasi jumlah
			if (trx.totalPrice !== grossAmount) {
				console.error(
					`[Webhook] Invalid amount for ${orderId}. DB: ${trx.totalPrice}, Midtrans: ${grossAmount}`
				);
				return;
			}

			// 6. mapping status Midtrans -> internal
			let newStatus: OrderStatus | null = null;

			if (transactionStatus === "capture") {
				if (fraudStatus === "accept") newStatus = OrderStatus.on_process;
				else if (fraudStatus === "challenge")
					newStatus = OrderStatus.waiting_confirmation;
				else if (fraudStatus === "deny") newStatus = OrderStatus.cancelled;
			} else if (transactionStatus === "settlement") {
				newStatus = OrderStatus.on_process;
			} else if (transactionStatus === "pending") {
				newStatus = OrderStatus.waiting_payment;
			} else if (
				["deny", "cancel", "expire", "failure"].includes(transactionStatus)
			) {
				newStatus = OrderStatus.cancelled;
			} else {
				// refund / chargeback / partial_refund / partial_chargeback dll.
				// sesuai permintaan: tidak melakukan DB action untuk kasus refund
				newStatus = null;
			}

			// 7. update DB jika diperlukan (set paidAt hanya saat benar-benar lunas)
			if (newStatus) {
				const updateData: Partial<{ status: OrderStatus; paidAt?: Date }> = {
					status: newStatus,
				};
				if (newStatus === OrderStatus.on_process) {
					updateData.paidAt = new Date();
				}

				await prisma.transaction.update({
					where: { id: orderId },
					data: updateData,
				});
				// log tetap minimal: hanya saat berhasil update
				console.info(
					`[Webhook] Transaction ${orderId} updated -> ${newStatus}`
				);
			}

			if (newStatus === OrderStatus.on_process) {
				const updatedTransaction = await prisma.transaction.update({
					where: { id: orderId },
					data: { status: newStatus, paidAt: new Date() },
				});

				const transactionWithUser = await prisma.transaction.findUnique({
					where: { id: orderId },
					include: { user: true },
				});
				if (transactionWithUser) {
					await sendPaymentConfirmedEmail(
						transactionWithUser.user,
						updatedTransaction
					);
				}
			}

			// selesai
			return;
		} catch (err) {
			// tangani error agar caller (webhook route) bisa memberikan response 4xx/5xx sesuai kebijakan
			console.error("[Webhook] Error processing Midtrans notification:", err);
			throw err;
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
		status?: OrderStatus,
		orderId?: string,
		date?: Date
	) {
		const whereCondition: Prisma.TransactionWhereInput = {
			userId: userId,
		};

		if (status) {
			whereCondition.status = status;
		}

		if (date) {
			const startDate = new Date(date);
			startDate.setHours(0, 0, 0, 0); // Mulai dari jam 00:00:00

			const endDate = new Date(date);
			endDate.setHours(23, 59, 59, 999); // Berakhir pada jam 23:59:59

			whereCondition.createdAt = {
				gte: startDate,
				lte: endDate,
			};
		}

		if (orderId) {
			whereCondition.id = orderId;
		}

		const transactions = await prisma.transaction.findMany({
			where: whereCondition,
			include: {
				products: {
					include: {
						product: true,
					},
				},
			},
			orderBy: { createdAt: "desc" },
		});

		return transactions;
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
	async getStoreTransactions(adminId: string, status?: OrderStatus) {
		const admin = await prisma.admin.findFirst({
			where: {
				id: adminId,
			},
		});

		if (!admin) {
			throw new ApiError(404, "Admin not found");
		}
		const storeId = admin.storeId;

		if (!storeId) throw new ApiError(404, "Admin has no store assigned");

		const transactions = await prisma.transaction.findMany({
			where: {
				storeId: storeId,
				status: status,
			},
			include: {
				products: {
					include: {
						product: true,
					},
				},
			},
		});

		return transactions;
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

	// Suped Admin Actions
	async getAllTransactions(adminId: string, storeId?: string) {
		const admin = await prisma.admin.findFirst({
			where: {
				id: adminId,
				isSuper: true,
			},
		});
		if (!admin) throw new ApiError(404, "Admin not found / not super admin");

		const whereCondition: Prisma.TransactionWhereInput = {};

		if (storeId) whereCondition.storeId = storeId;

		const transactions = await prisma.transaction.findMany({
			where: whereCondition,
			include: {
				products: {
					include: {
						product: true,
					},
				},
			},
		});
		return transactions;
	}
}
