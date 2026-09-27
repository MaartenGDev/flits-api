import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../../src/app";
import { UserReportController } from "../../src/controllers/userReportController";
import type { ReportVoteService } from "../../src/services/reportVoteService";
import type { UserReportService } from "../../src/services/userReportService";
import { mockReportVoteService, mockUserReportService, silentLogger } from "../support/fakes";
import { reportRow, reportVotePayload, userReportPayload } from "../support/fixtures";

const REPORT_ID = "859eea74-f9ab-4fd8-8b92-24ac1c31b3ed";

describe("UserReportController", () => {
    let userReportService: ReturnType<typeof mockUserReportService>;
    let reportVoteService: ReturnType<typeof mockReportVoteService>;
    let app: ReturnType<typeof createApp>;

    beforeEach(() => {
        userReportService = mockUserReportService();
        reportVoteService = mockReportVoteService();
        app = createApp({
            userReportController: new UserReportController(
                userReportService as unknown as UserReportService,
                reportVoteService as unknown as ReportVoteService,
            ),
            logger: silentLogger,
            httpLogLevel: "silent",
        });
    });

    describe("GET /reports", () => {
        it("lists active reports with the country uppercased", async () => {
            userReportService.listActiveReports.mockResolvedValue([reportRow()]);

            const res = await request(app).get("/reports?country=nl");

            expect(res.status).toBe(200);
            expect(res.body).toEqual([JSON.parse(JSON.stringify(reportRow()))]);
            expect(userReportService.listActiveReports).toHaveBeenCalledWith({ country: "NL" });
        });

        it("lists all countries when no filter is given", async () => {
            userReportService.listActiveReports.mockResolvedValue([]);

            const res = await request(app).get("/reports");

            expect(res.status).toBe(200);
            expect(res.body).toEqual([]);
            expect(userReportService.listActiveReports).toHaveBeenCalledWith({ country: undefined });
        });
    });

    describe("POST /reports", () => {
        it("rejects an invalid body with the failing path", async () => {
            const res = await request(app).post("/reports").send(userReportPayload({ report: { bearing1: null as never } }));

            expect(res.status).toBe(400);
            expect(res.body.message).toBe("Invalid user report");
            expect(res.body.issues[0].path).toEqual(["report", "bearing1"]);
            expect(userReportService.addReport).not.toHaveBeenCalled();
        });

        it("returns 201 for a newly created report", async () => {
            userReportService.addReport.mockResolvedValue({ outcome: "created", report: reportRow() });

            const res = await request(app).post("/reports").send(userReportPayload());

            expect(res.status).toBe(201);
            expect(res.body.outcome).toBe("created");
            expect(res.body.report.id).toBe(REPORT_ID);
            expect(userReportService.addReport).toHaveBeenCalledWith(userReportPayload());
        });

        it("returns 200 for a confirmed report", async () => {
            userReportService.addReport.mockResolvedValue({ outcome: "confirmed", report: reportRow({ user_count: 2 }) });

            const res = await request(app).post("/reports").send(userReportPayload());

            expect(res.status).toBe(200);
            expect(res.body.outcome).toBe("confirmed");
            expect(res.body.report.user_count).toBe(2);
        });

        it("returns 500 when the service fails", async () => {
            userReportService.addReport.mockRejectedValue(new Error("db down"));

            const res = await request(app).post("/reports").send(userReportPayload());

            expect(res.status).toBe(500);
        });
    });

    describe("POST /reports/:id/votes", () => {
        it("rejects an invalid body", async () => {
            const res = await request(app).post(`/reports/${REPORT_ID}/votes`).send({ user: {}, report: {} });

            expect(res.status).toBe(400);
            expect(res.body.message).toBe("Invalid report vote");
            expect(reportVoteService.vote).not.toHaveBeenCalled();
        });

        it("returns 404 for an unknown report", async () => {
            reportVoteService.vote.mockResolvedValue(null);

            const res = await request(app).post("/reports/00000000-0000-0000-0000-000000000000/votes").send(reportVotePayload());

            expect(res.status).toBe(404);
            expect(res.body).toEqual({ message: "Report not found" });
        });

        it("returns the vote result", async () => {
            reportVoteService.vote.mockResolvedValue({ outcome: "recorded", report: reportRow() });

            const res = await request(app).post(`/reports/${REPORT_ID}/votes`).send(reportVotePayload());

            expect(res.status).toBe(200);
            expect(res.body.outcome).toBe("recorded");
            expect(reportVoteService.vote).toHaveBeenCalledWith(REPORT_ID, reportVotePayload());
        });
    });
});
