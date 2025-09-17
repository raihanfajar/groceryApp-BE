import express from 'express';
import adminRouter from './admin.route';
import categoryRouter from './category.route';
import productRouter from './product.route';
import cartRouter from './cart.route';
import voucherRouter from './voucher.route';
import userRouter from './user.route';
import inventoryRouter from './inventory.route';
import discountRouter from './discount.route';
import reportRouter from './report.route';
import transactionRouter from './transaction.route';

const mainRouter = express.Router();

// Health check endpoint
mainRouter.get('/', (_, res) => {
	res.json({
		message: '🛒 FreshNear API is running!',
		status: 'healthy',
		timestamp: new Date().toISOString(),
	});
});

mainRouter.use('/user', userRouter);
mainRouter.use('/admin', adminRouter);
mainRouter.use('/inventory', inventoryRouter);
mainRouter.use('/discounts', discountRouter);
mainRouter.use('/reports', reportRouter);
mainRouter.use('/categories', categoryRouter);
mainRouter.use('/products', productRouter);
mainRouter.use('/cart', cartRouter);
mainRouter.use('/voucher', voucherRouter);
mainRouter.use('/transaction', transactionRouter);

export default mainRouter;
