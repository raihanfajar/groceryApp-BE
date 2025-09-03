import express from "express";
import authRouter from "./auth.route";
import adminRouter from "./admin.route";

const mainRouter = express.Router();

// Health check endpoint
mainRouter.get("/", (req, res) => {
	res.json({
		message: "🛒 FreshNear API is running!",
		status: "healthy",
		timestamp: new Date().toISOString(),
	});
});

mainRouter.use("/auth", authRouter);
mainRouter.use("/admin", adminRouter);

export default mainRouter;
