import { rateLimit, type RateLimitRequestHandler } from "express-rate-limit";

import type { Env } from "../utils/envConfig";

export function createRateLimiter(env: Env): RateLimitRequestHandler {
    return rateLimit({
        legacyHeaders: true,
        limit: env.COMMON_RATE_LIMIT_MAX_REQUESTS,
        standardHeaders: true,
        windowMs: 15 * 60 * env.COMMON_RATE_LIMIT_WINDOW_MS,
    });
}
