import express from "express";
import cors from "cors";
import mainRouter from "./routers/index.route";
import { errorHandler } from "./middlewares/errorHandler";
import passport from "./config/passport";
import { expiryTransactionSchedule } from "./jobs/cronJobs";
import { rajaCache } from "./utils/rajaCache";

const app = express();

app.use(cors());
app.use(express.json());
app.use(passport.initialize());

// health check
app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/", (_req, res) => res.json({ message: "API is alive" }));

app.use(mainRouter);
app.use(errorHandler);

// Initialize cache
void rajaCache.init().then(() => {
	console.log("✓ Cache initialized");
});

// // Cron jobs are now handled by Vercel Cron Jobs in production
// if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_JOBS !== "false") {
//     try {
//         expiryTransactionSchedule?.();
//         console.log("✓ scheduler started (development mode)");
//     } catch (err) {
//         console.error("scheduler failed to start:", err);
//     }
// }

if (process.env.ENABLE_CRON_JOBS === "true") {
	try {
		expiryTransactionSchedule?.();
		console.log("✓ scheduler started");
	} catch (err) {
		console.error("scheduler failed to start:", err);
	}
}

const PORT = process.env.PORT || 8000;

console.log('Starting server...');
console.log('Environment:', process.env.NODE_ENV);
console.log('Port:', PORT);

const server = app.listen(PORT, () => {
    console.log(`➜ API running on port ${PORT}`);
});

// Handle server errors
server.on('error', (error) => {
    console.error('Server error:', error);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
});

export default app;
