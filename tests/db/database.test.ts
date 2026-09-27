import type { Pool } from "pg";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Database } from "../../src/db/database";
import { silentLogger } from "../support/fakes";

function fakePool() {
    const client = { query: vi.fn(), release: vi.fn() };
    const pool = {
        on: vi.fn(),
        query: vi.fn(),
        connect: vi.fn().mockResolvedValue(client),
        end: vi.fn(),
    };
    return { pool: pool as unknown as Pool, raw: pool, client };
}

describe("Database", () => {
    let fake: ReturnType<typeof fakePool>;
    let database: Database;

    beforeEach(() => {
        fake = fakePool();
        database = new Database(fake.pool, silentLogger);
    });

    it("registers an error listener on the pool", () => {
        expect(fake.raw.on).toHaveBeenCalledWith("error", expect.any(Function));
    });

    it("delegates plain queries to the pool", async () => {
        fake.raw.query.mockResolvedValue({ rows: [{ a: 1 }] });

        const result = await database.query("SELECT $1", [1]);

        expect(fake.raw.query).toHaveBeenCalledWith("SELECT $1", [1]);
        expect(result.rows).toEqual([{ a: 1 }]);
    });

    it("closes the pool", async () => {
        await database.close();

        expect(fake.raw.end).toHaveBeenCalledOnce();
    });

    describe("withTransaction", () => {
        it("wraps the callback in BEGIN/COMMIT and releases the client", async () => {
            const result = await database.withTransaction(async (client) => {
                await client.query("INSERT 1");
                return "done";
            });

            expect(result).toBe("done");
            expect(fake.client.query.mock.calls.map((c) => c[0])).toEqual(["BEGIN", "INSERT 1", "COMMIT"]);
            expect(fake.client.release).toHaveBeenCalledOnce();
        });

        it("rolls back, rethrows and releases when the callback throws", async () => {
            const boom = new Error("boom");

            await expect(database.withTransaction(async () => { throw boom; })).rejects.toBe(boom);

            expect(fake.client.query.mock.calls.map((c) => c[0])).toEqual(["BEGIN", "ROLLBACK"]);
            expect(fake.client.release).toHaveBeenCalledOnce();
        });

        it("still throws the original error when the rollback fails", async () => {
            const boom = new Error("boom");
            fake.client.query.mockImplementation(async (sql: string) => {
                if (sql === "ROLLBACK") throw new Error("rollback failed");
                return { rows: [] };
            });

            await expect(database.withTransaction(async () => { throw boom; })).rejects.toBe(boom);
            expect(fake.client.release).toHaveBeenCalledOnce();
        });
    });
});
