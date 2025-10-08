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

app.use(mainRouter);
app.use(errorHandler);

// Initialize cache
void rajaCache.init().then(() => {
    console.log('✓ Cache initialized');
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

if (process.env.ENABLE_CRON_JOBS === 'true') {
    try {
        expiryTransactionSchedule?.();
        console.log("✓ scheduler started");
    } catch (err) {
        console.error("scheduler failed to start:", err);
    }
}

// For local development
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 8000;
    app.listen(Number(PORT), "0.0.0.0", () => {
        console.log(`➜ API running on port ${PORT}`);
    });
}

export default app;