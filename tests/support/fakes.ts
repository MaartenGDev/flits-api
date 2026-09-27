import { pino } from "pino";
import { type Mocked, vi } from "vitest";

import type { Db, Queryable } from "../../src/db/database";
import type { ReportRepository } from "../../src/repositories/reportRepository";
import type { ReportVoteService } from "../../src/services/reportVoteService";
import type { UserReportService } from "../../src/services/userReportService";

export const silentLogger = pino({ level: "silent" });

/**
 * A Db whose transaction just runs the callback with a stub client. Tests get the
 * client back so they can assert the repository was called with that exact object.
 */
export function fakeDb(): { db: Db; client: Queryable } {
    // `query` is generic, which vi.fn cannot express; nothing calls it because the repository is mocked too.
    const client: Queryable = { query: vi.fn() as unknown as Queryable["query"] };
    const db: Db = {
        query: vi.fn() as unknown as Queryable["query"],
        withTransaction: (fn) => fn(client),
    };
    return { db, client };
}

export function mockReportRepository(): Mocked<ReportRepository> {
    return {
        findActiveCandidates: vi.fn<ReportRepository["findActiveCandidates"]>(),
        getReport: vi.fn<ReportRepository["getReport"]>(),
        listActiveReports: vi.fn<ReportRepository["listActiveReports"]>(),
        insertReport: vi.fn<ReportRepository["insertReport"]>(),
        confirmReport: vi.fn<ReportRepository["confirmReport"]>(),
        archiveReport: vi.fn<ReportRepository["archiveReport"]>(),
        insertUserReport: vi.fn<ReportRepository["insertUserReport"]>(),
        insertVote: vi.fn<ReportRepository["insertVote"]>(),
        countNegativeVotes: vi.fn<ReportRepository["countNegativeVotes"]>(),
    };
}

type PublicMethods<T> = { [K in keyof T as T[K] extends (...args: never[]) => unknown ? K : never]: T[K] };

export type MockedUserReportService = Mocked<PublicMethods<UserReportService>>;
export type MockedReportVoteService = Mocked<PublicMethods<ReportVoteService>>;

export function mockUserReportService(): MockedUserReportService {
    return {
        listActiveReports: vi.fn<UserReportService["listActiveReports"]>(),
        addReport: vi.fn<UserReportService["addReport"]>(),
    };
}

export function mockReportVoteService(): MockedReportVoteService {
    return {
        vote: vi.fn<ReportVoteService["vote"]>(),
    };
}
