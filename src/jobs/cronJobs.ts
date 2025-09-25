import cron from 'node-cron';
import { shippingTransaction } from './transactionJobs/shippingJobs';
import { confirmingOrderTransaction } from './transactionJobs/confirmingOrderJobs';

export const expiryTransactionSchedule = () => {
	cron.schedule('0 * * * *', async () => {
		// Run every hour
		console.log('[⌚ CRON] Executing expiry transaction job...');
		// Confirming order transaction
		await confirmingOrderTransaction();
		// Jobs for Shipping
		await shippingTransaction();
	});
};
