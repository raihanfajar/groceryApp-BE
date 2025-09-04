import express from 'express';
import authRouter from './auth.route';
import adminRouter from './admin.route';
import categoryRouter from './category.route';
import productRouter from './product.route';
import cartRouter from './cart.route';

const mainRouter = express.Router();

// Health check endpoint
mainRouter.get("/", (req, res) => {
	res.json({
		message: "🛒 FreshNear API is running!",
		status: "healthy",
		timestamp: new Date().toISOString(),
	});
});

mainRouter.use('/auth', authRouter);
mainRouter.use('/admin', adminRouter);
mainRouter.use('/categories', categoryRouter);
mainRouter.use('/products', productRouter);
mainRouter.use('/cart', cartRouter);

export default mainRouter;
