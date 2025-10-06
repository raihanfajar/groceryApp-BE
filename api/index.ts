import express from "express";
import cors from "cors";
import mainRouter from '../src/routers/index.route';
import { errorHandler } from '../src/middlewares/errorHandler';
import passport from '../src/config/passport';
import { rajaCache } from '../src/utils/rajaCache';

const app = express();

app.use(cors());
app.use(express.json());
app.use(passport.initialize());

// Initialize cache
void rajaCache.init().then(() => {
    console.log('✓ Cache initialized');
});

app.use(mainRouter);
app.use(errorHandler);

export default app;
