import { shippingTransaction } from '../../src/jobs/transactionJobs/shippingJobs';
import { confirmingOrderTransaction } from '../../src/jobs/transactionJobs/confirmingOrderJobs';

export const config = {
    schedule: '0 0 * * *' // runs once per day at midnight UTC
};

export default async function handler() {
    try {
        console.log('[⌚ CRON] Executing expiry transaction job...');
        // Confirming order transaction
        await confirmingOrderTransaction();
        // Jobs for Shipping
        await shippingTransaction();
        
        return new Response('Cron job executed successfully', { status: 200 });
    } catch (error) {
        console.error('Cron job failed:', error);
        return new Response('Cron job failed', { status: 500 });
    }
}