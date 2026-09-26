import express, { type Express } from "express";
import helmet from "helmet";
import {pinoHttp} from "pino-http";
import rateLimiter from "@/middleware/rateLimiter";
import {userReportRouter} from "@/routers/userReportRouter";
import { logger } from "./middleware/logger";
import {env} from "@/utils/envConfig";

const app: Express = express();

// Logging
app.use(pinoHttp({ logger, level: env.HTTP_LOG_LEVEL }));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(rateLimiter);


// Routes
app.use("/reports", userReportRouter);

export { app, logger };