import { beforeEach, describe, expect, it } from "vitest";

import { ReportVoteService } from "../../src/services/reportVoteService";
import { fakeDb, mockReportRepository } from "../support/fakes";
import { reportRow, reportVotePayload } from "../support/fixtures";

describe("ReportVoteService", () => {
    let db: ReturnType<typeof fakeDb>;
    let reports: ReturnType<typeof mockReportRepository>;
    let service: ReportVoteService;

    beforeEach(() => {
        db = fakeDb();
        reports = mockReportRepository();
        service = new ReportVoteService(db.db, reports);
    });

    it("returns null and records nothing for an unknown report", async () => {
        reports.getReport.mockResolvedValue(null);

        await expect(service.vote("missing", reportVotePayload())).resolves.toBeNull();
        expect(reports.getReport).toHaveBeenCalledWith(db.client, "missing");
        expect(reports.insertVote).not.toHaveBeenCalled();
    });

    it("stores the vote with the user fields mapped", async () => {
        const report = reportRow({ id: "r1" });
        reports.getReport.mockResolvedValue(report);
        reports.countNegativeVotes.mockResolvedValue(1);

        await service.vote("r1", reportVotePayload({ user: { longitude: 4.87359149999, latitude: 52.33841249 } }));

        expect(reports.insertVote).toHaveBeenCalledWith(db.client, {
            reportId: "r1",
            uid: "device-4",
            userid: null,
            seen: false,
            automatic: false,
            source: "citsPopup",
            lon: 4.873591,
            lat: 52.338412,
            heading: 114.5,
            speed: 19.8,
            gpsPath: [[4.8721, 52.3376], [4.8729, 52.3381]],
        });
    });

    it("keeps the userid when the user is logged in", async () => {
        reports.getReport.mockResolvedValue(reportRow());
        reports.countNegativeVotes.mockResolvedValue(0);

        await service.vote("r1", reportVotePayload({ user: { userid: "user-4" } }));

        expect(reports.insertVote).toHaveBeenCalledWith(db.client, expect.objectContaining({ userid: "user-4" }));
    });

    it("only records the vote when the report is not active", async () => {
        const archived = reportRow({ status: "archived" });
        reports.getReport.mockResolvedValue(archived);

        const result = await service.vote("r1", reportVotePayload({ report: { seen: true } }));

        expect(result).toEqual({ outcome: "recorded", report: archived });
        expect(reports.confirmReport).not.toHaveBeenCalled();
        expect(reports.countNegativeVotes).not.toHaveBeenCalled();
        expect(reports.archiveReport).not.toHaveBeenCalled();
    });

    describe("seen", () => {
        it("confirms the report", async () => {
            const confirmed = reportRow({ user_count: 2 });
            reports.getReport.mockResolvedValue(reportRow());
            reports.confirmReport.mockResolvedValue(confirmed);

            const result = await service.vote("r1", reportVotePayload({ report: { seen: true } }));

            expect(result).toEqual({ outcome: "confirmed", report: confirmed });
            expect(reports.confirmReport).toHaveBeenCalledWith(db.client, reportRow().id);
            expect(reports.countNegativeVotes).not.toHaveBeenCalled();
        });

        it("falls back to recorded when the confirmation no longer applies", async () => {
            const report = reportRow();
            reports.getReport.mockResolvedValue(report);
            reports.confirmReport.mockResolvedValue(null);

            const result = await service.vote("r1", reportVotePayload({ report: { seen: true } }));

            expect(result).toEqual({ outcome: "recorded", report });
        });
    });

    describe("not seen", () => {
        it("records the first negative vote without archiving", async () => {
            const report = reportRow();
            reports.getReport.mockResolvedValue(report);
            reports.countNegativeVotes.mockResolvedValue(1);

            const result = await service.vote("r1", reportVotePayload({ report: { seen: false } }));

            expect(result).toEqual({ outcome: "recorded", report });
            expect(reports.archiveReport).not.toHaveBeenCalled();
        });

        it("archives the report on the second negative vote", async () => {
            const archived = reportRow({ status: "archived" });
            reports.getReport.mockResolvedValue(reportRow());
            reports.countNegativeVotes.mockResolvedValue(2);
            reports.archiveReport.mockResolvedValue(archived);

            const result = await service.vote("r1", reportVotePayload({ report: { seen: false } }));

            expect(result).toEqual({ outcome: "archived", report: archived });
            expect(reports.archiveReport).toHaveBeenCalledWith(db.client, reportRow().id);
        });

        it("falls back to recorded when archiving no longer applies", async () => {
            const report = reportRow();
            reports.getReport.mockResolvedValue(report);
            reports.countNegativeVotes.mockResolvedValue(2);
            reports.archiveReport.mockResolvedValue(null);

            const result = await service.vote("r1", reportVotePayload({ report: { seen: false } }));

            expect(result).toEqual({ outcome: "recorded", report });
        });
    });
});
