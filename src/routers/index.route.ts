import express from 'express';
import adminRouter from './admin.route';
import categoryRouter from './category.route';
import productRouter from './product.route';
import cartRouter from './cart.route';
import voucherRouter from './voucher.route';
import userRouter from './user.route';

const mainRouter = express.Router();

// Health check endpoint
mainRouter.get("/", (_, res) => {
	res.json({
		message: "🛒 FreshNear API is running!",
		status: "healthy",
		timestamp: new Date().toISOString(),
	});
});

mainRouter.use('/user', userRouter);
mainRouter.use('/admin', adminRouter);
mainRouter.use('/categories', categoryRouter);
mainRouter.use('/products', productRouter);
mainRouter.use('/cart', cartRouter);
mainRouter.use('/voucher', voucherRouter)

export default mainRouter;
