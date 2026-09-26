import { checkConnection, closePool } from "@/db/pool";
import { env } from "@/utils/envConfig";
import { app, logger } from "@/server";

async function main() {
    try {
        await checkConnection();
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
            await closePool();
            logger.info("server closed");
            process.exit(0);
        });
        setTimeout(() => process.exit(1), 10000).unref(); // Force shutdown after 10s
    };

    process.on("SIGINT", onCloseSignal);
    process.on("SIGTERM", onCloseSignal);
}

void main();
