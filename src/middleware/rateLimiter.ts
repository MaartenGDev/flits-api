import { rateLimit } from "express-rate-limit";

import { env } from "@/utils/envConfig";

const rateLimiter = rateLimit({
    legacyHeaders: true,
    limit: env.COMMON_RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    windowMs: 15 * 60 * env.COMMON_RATE_LIMIT_WINDOW_MS
});

export default rateLimiter;