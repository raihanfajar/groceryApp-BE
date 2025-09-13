import express from 'express';
import cors from 'cors';
import mainRouter from './routers/index.route';
import { errorHandler } from './middlewares/errorHandler';
import passport from './config/passport';

const PORT = process.env.PORT || 8000;

const app = express();

app.use(cors()); // For safely connecting to Front End
app.use(express.json()); // !Middleware to parse incoming requests with JSON payloads
app.use(passport.initialize()); // !Middleware to initialize passport (GOOGLE OAUTH)

app.use(mainRouter); // !Main Router
app.use(errorHandler); // !Custom Error Handler Middleware (should be last)

app.listen(PORT, () => {
	console.log(
		`⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡ [API] Server runs on port ${PORT} ⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡`
	);
});
