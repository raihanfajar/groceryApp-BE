import express from "express";
import cors from "cors";
import mainRouter from "./routers/index.route";
import { errorHandler } from "./middlewares/errorHandler";
import passport from "./config/passport";
import { expiryTransactionSchedule } from "./jobs/cronJobs";
import { rajaCache } from "./utils/rajaCache";

const app = express();

app.use(cors({
    origin: ["http://localhost:3000", "https://freshnear.store"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: "*"
}));
app.use(express.json());
app.use(passport.initialize());

// Health check endpoint for Railway
app.get('/', (req, res) => {
    res.json({
        status: 'healthy',
        message: '🛒 FreshNear API is running!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});

// Health check endpoint for Railway /health as mentioned in docs
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        message: '🛒 FreshNear API is running!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});

// API routes
app.use(mainRouter);
app.use(errorHandler);

// Initialize cache
void rajaCache.init().then(() => {
    console.log("✓ Cache initialized");
});

// Always start cron jobs regardless of environment
try {
    expiryTransactionSchedule();
    console.log("✓ Cron jobs scheduler started");
    console.log("⌚ Running transaction checks every minute");
} catch (err) {
    console.error("❌ Scheduler failed to start:", err);
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
