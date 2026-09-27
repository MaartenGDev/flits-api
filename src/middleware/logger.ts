import { pino, type Logger } from "pino";

import type { Env } from "../utils/envConfig";

export function createLogger(env: Env): Logger {
    return pino({
        level: env.LOG_LEVEL,
        transport: env.isDevelopment
            ? { target: "pino-pretty", options: { colorize: true } }
            : undefined,
    });
}
