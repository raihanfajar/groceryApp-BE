// Function for confirming transaction (changing status from waiting_confirmation to on_process)
import { prisma } from "../../lib/prisma";

export const confirmingOrderTransaction = async () => {
	const confirmingOrderStatus = await prisma.transaction.updateMany({
		where: {
			status: "waiting_confirmation",
			expiryAt: {
				lt: new Date(),
			},
		},
		data: {
			status: "on_process",
		},
	});
	if (confirmingOrderStatus.count > 0) {
		console.log(
			`[⌚ CRON] ${confirmingOrderStatus.count} confirming order transactions have been confirmed.`
		);
	}
};
