import express from "express";
import cors from "cors";
import mainRouter from "../src/routers/index.route";
import { errorHandler } from "../src/middlewares/errorHandler";
import passport from "../src/config/passport";
import { rajaCache } from "../src/utils/rajaCache";
import { expiryTransactionSchedule } from "../src/jobs/cronJobs";

const app = express();

app.use(cors());
app.use(express.json());
app.use(passport.initialize());

// Add explicit health check endpoint (before mainRouter)
app.get("/", (req, res) => {
	res.json({
		status: "healthy",
		message: "🛒 FreshNear API is running!",
		timestamp: new Date().toISOString(),
		environment: process.env.NODE_ENV
	});
});

// Initialize cache
void rajaCache.init().then(() => {
	console.log("✓ Cache initialized");
});

// Initialize cron jobs
try {
	expiryTransactionSchedule();
	console.log("✓ Cron jobs scheduler started");
	console.log("⌚ Running transaction checks every minute");
} catch (err) {
	console.error("❌ Scheduler failed to start:", err);
}

// API routes
app.use(mainRouter);
app.use(errorHandler);
app.get("/", (req, res) => {
	res.json({
		status: "healthy",
		message: "🛒 FreshNear API is running!",
		timestamp: new Date().toISOString(),
	});
});

const PORT = process.env.PORT || 8000;

if (require.main === module) {
	app.listen(PORT, () => {
		console.log(`➜ Server running on port ${PORT}`);
	});
}

export default app;
