import { beforeEach, describe, expect, it } from "vitest";

import { ReportType } from "../../src/models/reportType";
import { DeduplicationService } from "../../src/services/deduplicationService";
import { UserReportService } from "../../src/services/userReportService";
import { fakeDb, mockReportRepository, silentLogger } from "../support/fakes";
import { candidateRow, reportRow, userReportPayload } from "../support/fixtures";

describe("UserReportService", () => {
    let db: ReturnType<typeof fakeDb>;
    let reports: ReturnType<typeof mockReportRepository>;
    let service: UserReportService;

    beforeEach(() => {
        db = fakeDb();
        reports = mockReportRepository();
        service = new UserReportService(db.db, reports, new DeduplicationService(), silentLogger);
    });

    describe("listActiveReports", () => {
        it("forwards the country filter to the repository using the pool", async () => {
            const rows = [reportRow()];
            reports.listActiveReports.mockResolvedValue(rows);

            await expect(service.listActiveReports({ country: "NL" })).resolves.toBe(rows);
            expect(reports.listActiveReports).toHaveBeenCalledWith(db.db, { country: "NL" });
        });
    });

    describe("addReport", () => {
        it("creates a new report when there are no candidates", async () => {
            const created = reportRow({ id: "new" });
            reports.findActiveCandidates.mockResolvedValue([]);
            reports.insertReport.mockResolvedValue(created);

            const result = await service.addReport(userReportPayload());

            expect(result).toEqual({ outcome: "created", report: created });
            expect(reports.findActiveCandidates).toHaveBeenCalledWith(db.client, {
                country: "NL",
                type: ReportType.STATIONARY_VEHICLE,
                lon: 4.873591,
                lat: 52.338412,
                radiusM: 200,
            });
            expect(reports.confirmReport).not.toHaveBeenCalled();
            expect(reports.insertReport).toHaveBeenCalledWith(db.client, expect.objectContaining({ country: "NL", bearing1: 112 }));
            expect(reports.insertUserReport).toHaveBeenCalledWith(db.client, expect.objectContaining({
                reportId: "new",
                outcome: "created",
                uid: "device-1",
                userid: "user-1",
                language: "nl",
                altitude: 3.2,
                speed: 24.6,
                gpsPath: [[4.8721, 52.3376], [4.8729, 52.3381]],
            }));
        });

        it("confirms a nearby report driving the same way", async () => {
            const confirmed = reportRow({ id: "c1", user_count: 2 });
            reports.findActiveCandidates.mockResolvedValue([candidateRow({ id: "c1", bearing1: 118 })]);
            reports.confirmReport.mockResolvedValue(confirmed);

            const result = await service.addReport(userReportPayload());

            expect(result).toEqual({ outcome: "confirmed", report: confirmed });
            expect(reports.confirmReport).toHaveBeenCalledExactlyOnceWith(db.client, "c1");
            expect(reports.insertReport).not.toHaveBeenCalled();
            expect(reports.insertUserReport).toHaveBeenCalledWith(db.client, expect.objectContaining({ reportId: "c1", outcome: "confirmed" }));
        });

        it("adds the second bearing when a two-sided report is confirmed from the other side", async () => {
            const confirmed = reportRow({ id: "c1", bearing1: 47, bearing2: 227 });
            reports.findActiveCandidates.mockResolvedValue([candidateRow({ id: "c1", bearing1: 47 })]);
            reports.confirmReport.mockResolvedValue(confirmed);

            const result = await service.addReport(
                userReportPayload({ report: { type_id: ReportType.SPEED_TRAP, bearing1: 227 } }),
            );

            expect(result.outcome).toBe("confirmed");
            expect(reports.confirmReport).toHaveBeenCalledExactlyOnceWith(db.client, "c1", { bearing2: 227 });
        });

        it("skips candidates that do not match and creates a new report", async () => {
            const created = reportRow({ id: "new" });
            reports.findActiveCandidates.mockResolvedValue([candidateRow({ id: "far", distance_m: 250 })]);
            reports.insertReport.mockResolvedValue(created);

            const result = await service.addReport(userReportPayload());

            expect(result.outcome).toBe("created");
            expect(reports.confirmReport).not.toHaveBeenCalled();
        });

        it("moves on to the next candidate when confirming fails because the report is no longer active", async () => {
            const confirmed = reportRow({ id: "c2" });
            reports.findActiveCandidates.mockResolvedValue([candidateRow({ id: "c1" }), candidateRow({ id: "c2" })]);
            reports.confirmReport.mockResolvedValueOnce(null).mockResolvedValueOnce(confirmed);

            const result = await service.addReport(userReportPayload());

            expect(result).toEqual({ outcome: "confirmed", report: confirmed });
            expect(reports.confirmReport).toHaveBeenCalledTimes(2);
            expect(reports.insertReport).not.toHaveBeenCalled();
        });

        it("creates a new report when every candidate was archived in the meantime", async () => {
            const created = reportRow({ id: "new" });
            reports.findActiveCandidates.mockResolvedValue([candidateRow({ id: "c1" }), candidateRow({ id: "c2" })]);
            reports.confirmReport.mockResolvedValue(null);
            reports.insertReport.mockResolvedValue(created);

            const result = await service.addReport(userReportPayload());

            expect(result).toEqual({ outcome: "created", report: created });
            expect(reports.confirmReport).toHaveBeenCalledTimes(2);
        });
    });
});
