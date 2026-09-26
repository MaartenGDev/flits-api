import { Pool, type PoolClient } from "pg";

import { logger } from "@/middleware/logger";
import { env } from "@/utils/envConfig";

/** Anything that can run a query: the shared pool or a client inside a transaction. */
export type Queryable = Pick<PoolClient, "query">;

export const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: env.DATABASE_POOL_MAX,
});

pool.on("error", (err) => {
    logger.error({ err }, "idle postgres client error");
});

/** Fails fast at boot when the database or the PostGIS extension is unavailable. */
export async function checkConnection(): Promise<void> {
    const result = await pool.query<{ version: string }>("SELECT postgis_lib_version() AS version");
    logger.info({ postgis: result.rows[0]?.version }, "database connection ok");
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await fn(client);
        await client.query("COMMIT");
        return result;
    } catch (err) {
        try {
            await client.query("ROLLBACK");
        } catch (rollbackErr) {
            logger.error({ err: rollbackErr }, "rollback failed");
        }
        throw err;
    } finally {
        client.release();
    }
}

export async function closePool(): Promise<void> {
    await pool.end();
}
