import express, { type Express, type RequestHandler } from "express";
import helmet from "helmet";
import type { Logger } from "pino";
import { pinoHttp } from "pino-http";

import type { UserReportController } from "./controllers/userReportController";
import { createUserReportRouter } from "./routers/userReportRouter";

export interface AppDependencies {
    userReportController: UserReportController;
    logger: Logger;
    httpLogLevel: string;
    /** Omitted in tests so request counts never hit the limit. */
    rateLimiter?: RequestHandler;
}

export function createApp(deps: AppDependencies): Express {
    const app: Express = express();

    // Logging
    app.use(pinoHttp({ logger: deps.logger, level: deps.httpLogLevel }));

    // Middlewares
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(helmet());
    if (deps.rateLimiter) {
        app.use(deps.rateLimiter);
    }

    // Routes
    app.use("/reports", createUserReportRouter(deps.userReportController));

    return app;
}
