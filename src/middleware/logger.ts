import {pino} from "pino";
import { env } from "@/utils/envConfig";

export const logger = pino({
    level: env.LOG_LEVEL || 'warn',
    transport: env.isDevelopment
        ? { target: 'pino-pretty', options: { colorize: true }}
        : undefined,
});