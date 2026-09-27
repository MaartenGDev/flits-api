import { Pool, type QueryResult, type QueryResultRow } from "pg";
import type { Logger } from "pino";

import type { Env } from "../utils/envConfig";

/**
 * Anything that can run a parameterised query: the shared pool or a client inside a
 * transaction. Only the promise-based text+values form is exposed; that is all the
 * repositories use and it keeps test doubles trivial.
 */
export interface Queryable {
    query<R extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]): Promise<QueryResult<R>>;
}

export interface TransactionRunner {
    withTransaction<T>(fn: (client: Queryable) => Promise<T>): Promise<T>;
}

/** What the services need from the database: plain queries and transactions. */
export interface Db extends Queryable, TransactionRunner {}

export function createPool(env: Env): Pool {
    return new Pool({
        connectionString: env.DATABASE_URL,
        max: env.DATABASE_POOL_MAX,
    });
}

export class Database implements Db {
    constructor(
        private readonly pool: Pool,
        private readonly logger: Logger,
    ) {
        pool.on("error", (err) => {
            logger.error({ err }, "idle postgres client error");
        });
    }

    public query<R extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]): Promise<QueryResult<R>> {
        return this.pool.query<R>(text, values);
    }

    /** Fails fast at boot when the database or the PostGIS extension is unavailable. */
    public async checkConnection(): Promise<void> {
        const result = await this.pool.query<{ version: string }>("SELECT postgis_lib_version() AS version");
        this.logger.info({ postgis: result.rows[0]?.version }, "database connection ok");
    }

    public async withTransaction<T>(fn: (client: Queryable) => Promise<T>): Promise<T> {
        const client = await this.pool.connect();
        try {
            await client.query("BEGIN");
            const result = await fn(client);
            await client.query("COMMIT");
            return result;
        } catch (err) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackErr) {
                this.logger.error({ err: rollbackErr }, "rollback failed");
            }
            throw err;
        } finally {
            client.release();
        }
    }

    public async close(): Promise<void> {
        await this.pool.end();
    }
}
