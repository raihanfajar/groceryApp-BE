// Function for shipping transaction (changing status from shipped to confirmed)
import { prisma } from "../../lib/prisma";

export const shippingTransaction = async () => {
	const shippedStatus = await prisma.transaction.updateMany({
		where: {
			status: "shipped",
			expiryAt: {
				lt: new Date(), // lt = less than (lebih kecil dari)
			},
		},
		data: {
			status: "completed",
			expiryAt: null,
		},
	});
	if (shippedStatus.count > 0) {
		console.log(
			`[⌚ CRON] ${shippedStatus.count} shipped transactions have been confirmed.`
		);
	} else {
		console.log("[⌚ CRON] No shipped transactions to process.");
	}
};
