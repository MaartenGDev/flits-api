import dotenv from "dotenv";

import { createApp } from "./app";
import { UserReportController } from "./controllers/userReportController";
import { createPool, Database } from "./db/database";
import { createLogger } from "./middleware/logger";
import { createRateLimiter } from "./middleware/rateLimiter";
import { ReportRepository } from "./repositories/reportRepository";
import { DeduplicationService } from "./services/deduplicationService";
import { ReportVoteService } from "./services/reportVoteService";
import { UserReportService } from "./services/userReportService";
import { parseEnv } from "./utils/envConfig";

dotenv.config();

const env = parseEnv(process.env);
const logger = createLogger(env);
const database = new Database(createPool(env), logger);

const reportRepository = new ReportRepository();
const deduplicationService = new DeduplicationService();
const userReportService = new UserReportService(database, reportRepository, deduplicationService, logger);
const reportVoteService = new ReportVoteService(database, reportRepository);
const userReportController = new UserReportController(userReportService, reportVoteService);

const app = createApp({
    userReportController,
    logger,
    httpLogLevel: env.HTTP_LOG_LEVEL,
    rateLimiter: createRateLimiter(env),
});

async function main() {
    try {
        await database.checkConnection();
    } catch (err) {
        logger.fatal({ err }, "database unavailable, shutting down");
        process.exit(1);
    }

    const server = app.listen(env.PORT, () => {
        const { NODE_ENV, HOST, PORT } = env;
        logger.info(`Server (${NODE_ENV}) running on port http://${HOST}:${PORT}`);
    });

    const onCloseSignal = () => {
        logger.info("sigint received, shutting down");
        server.close(async () => {
            await database.close();
            logger.info("server closed");
            process.exit(0);
        });
        setTimeout(() => process.exit(1), 10000).unref(); // Force shutdown after 10s
    };

    process.on("SIGINT", onCloseSignal);
    process.on("SIGTERM", onCloseSignal);
}

void main();
