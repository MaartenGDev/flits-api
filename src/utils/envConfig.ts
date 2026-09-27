import { z } from "zod";

const logLevels = ["fatal", "error", "warn", "info", "debug", "trace", "silent"] as const;

export const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    HOST: z.string().min(1).default("localhost"),
    PORT: z.coerce.number().int().positive().default(8080),
    LOG_LEVEL: z.enum(logLevels).default("info"),
    HTTP_LOG_LEVEL: z.enum(logLevels).default("warn"),
    COMMON_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(1000),
    COMMON_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(1000),
    DATABASE_URL: z.string().min(1),
    DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
});

export type Env = ReturnType<typeof parseEnv>;

export function parseEnv(source: NodeJS.ProcessEnv) {
    const parsed = envSchema.safeParse(source);

    if (!parsed.success) {
        console.error("Invalid environment variables:", parsed.error);
        throw new Error("Invalid environment variables");
    }

    return {
        ...parsed.data,
        isDevelopment: parsed.data.NODE_ENV === "development",
        isTest: parsed.data.NODE_ENV === "test",
        isProduction: parsed.data.NODE_ENV === "production",
    };
}
