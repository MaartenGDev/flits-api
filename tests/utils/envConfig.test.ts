import { describe, expect, it, vi } from "vitest";

import { parseEnv } from "../../src/utils/envConfig";

describe("parseEnv", () => {
    it("applies defaults when only the database url is given", () => {
        const env = parseEnv({ DATABASE_URL: "postgres://x" });

        expect(env).toMatchObject({
            NODE_ENV: "development",
            HOST: "localhost",
            PORT: 8080,
            LOG_LEVEL: "info",
            HTTP_LOG_LEVEL: "warn",
            COMMON_RATE_LIMIT_MAX_REQUESTS: 1000,
            COMMON_RATE_LIMIT_WINDOW_MS: 1000,
            DATABASE_POOL_MAX: 10,
            isDevelopment: true,
            isTest: false,
            isProduction: false,
        });
    });

    it("coerces numeric strings", () => {
        const env = parseEnv({ DATABASE_URL: "postgres://x", PORT: "3000", DATABASE_POOL_MAX: "2" });

        expect(env.PORT).toBe(3000);
        expect(env.DATABASE_POOL_MAX).toBe(2);
    });

    it("accepts NODE_ENV=test", () => {
        const env = parseEnv({ DATABASE_URL: "postgres://x", NODE_ENV: "test" });

        expect(env.isTest).toBe(true);
        expect(env.isDevelopment).toBe(false);
    });

    it("throws without a database url", () => {
        vi.spyOn(console, "error").mockImplementation(() => {});

        expect(() => parseEnv({})).toThrow("Invalid environment variables");
    });

    it("rejects an unknown NODE_ENV", () => {
        vi.spyOn(console, "error").mockImplementation(() => {});

        expect(() => parseEnv({ DATABASE_URL: "postgres://x", NODE_ENV: "staging" })).toThrow();
    });
});
