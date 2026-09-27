import { beforeEach, describe, expect, it } from "vitest";

import { ReportType } from "../../src/models/reportType";
import { type Candidate, DeduplicationService, type Submission } from "../../src/services/deduplicationService";
import { userReportPayload } from "../support/fixtures";

function submission(overrides: Partial<Submission> = {}): Submission {
    return {
        country: "NL",
        type: ReportType.STATIONARY_VEHICLE,
        lon: 4.873591,
        lat: 52.338412,
        bearing1: 112,
        bearing2: null,
        road: "A10",
        hmp: 17.4,
        maxSpeed: null,
        redLight: null,
        source: "test",
        ...overrides,
    };
}

function candidate(overrides: Partial<Candidate> = {}): Candidate {
    return { id: "c1", bearing1: 112, bearing2: null, distanceM: 10, ...overrides };
}

describe("DeduplicationService", () => {
    let service: DeduplicationService;

    beforeEach(() => {
        service = new DeduplicationService();
    });

    describe("isTwoSided", () => {
        it.each([ReportType.SPEED_TRAP, ReportType.SPEED_CAM, ReportType.TRAFFIC_CAM, ReportType.CONTROL])(
            "treats type %i as two-sided",
            (type) => {
                expect(service.isTwoSided(type)).toBe(true);
            },
        );

        it("treats a stationary vehicle as one-sided", () => {
            expect(service.isTwoSided(ReportType.STATIONARY_VEHICLE)).toBe(false);
        });
    });

    describe("normaliseSubmission", () => {
        it("uppercases the country and keeps the plain fields", () => {
            const sub = service.normaliseSubmission(userReportPayload({ report: { country_code: "nl" } }).report);

            expect(sub).toMatchObject({
                country: "NL",
                type: ReportType.STATIONARY_VEHICLE,
                road: "A10",
                hmp: 17.4,
                maxSpeed: null,
                redLight: null,
                source: "test",
            });
        });

        it("snaps coordinates to six decimals", () => {
            const sub = service.normaliseSubmission(
                userReportPayload({ report: { longitude: 4.87359149999, latitude: 52.33841249 } }).report,
            );

            expect(sub.lon).toBe(4.873591);
            expect(sub.lat).toBe(52.338412);
        });

        it("normalises both bearings", () => {
            const sub = service.normaliseSubmission(userReportPayload({ report: { bearing1: -10, bearing2: 370 } }).report);

            expect(sub.bearing1).toBe(350);
            expect(sub.bearing2).toBe(10);
        });

        it("keeps a null second bearing", () => {
            expect(service.normaliseSubmission(userReportPayload().report).bearing2).toBeNull();
        });

        it.each(["", "   ", "-"])("maps road %j to null", (road) => {
            expect(service.normaliseSubmission(userReportPayload({ report: { road } }).report).road).toBeNull();
        });

        it("maps the '-' placeholders for hmp and max_speed to null", () => {
            const sub = service.normaliseSubmission(userReportPayload({ report: { hmp: "-", max_speed: "-" } }).report);

            expect(sub.hmp).toBeNull();
            expect(sub.maxSpeed).toBeNull();
        });

        it("keeps a zero hmp and a numeric max_speed", () => {
            const sub = service.normaliseSubmission(userReportPayload({ report: { hmp: 0, max_speed: 100 } }).report);

            expect(sub.hmp).toBe(0);
            expect(sub.maxSpeed).toBe(100);
        });
    });

    describe("compareSubmissionWithExistingReport", () => {
        it("rejects a candidate outside the merge radius", () => {
            expect(service.compareSubmissionWithExistingReport(submission(), candidate({ distanceM: 201 }))).toEqual({
                isMatch: false,
                reason: "distance",
            });
        });

        it("accepts a candidate exactly on the merge radius", () => {
            expect(service.compareSubmissionWithExistingReport(submission(), candidate({ distanceM: 200 })).isMatch).toBe(true);
        });

        it("matches when the first bearing is within 45 degrees", () => {
            expect(service.compareSubmissionWithExistingReport(submission({ bearing1: 157 }), candidate())).toEqual({
                isMatch: true,
                kind: "already_reported",
            });
        });

        it("rejects a one-sided report 46 degrees off", () => {
            expect(service.compareSubmissionWithExistingReport(submission({ bearing1: 158 }), candidate())).toEqual({
                isMatch: false,
                reason: "direction",
            });
        });

        it("matches via the candidate's second bearing", () => {
            const result = service.compareSubmissionWithExistingReport(
                submission({ bearing1: 300 }),
                candidate({ bearing1: 112, bearing2: 292 }),
            );

            expect(result).toEqual({ isMatch: true, kind: "already_reported" });
        });

        it("adds the other side for a two-sided type driving the opposite way", () => {
            const result = service.compareSubmissionWithExistingReport(
                submission({ type: ReportType.SPEED_TRAP, bearing1: 227 }),
                candidate({ bearing1: 47 }),
            );

            expect(result).toEqual({ isMatch: true, kind: "also_on_other_side", bearing2: 227 });
        });

        it("treats 135 degrees as opposite but 134 as a different direction", () => {
            const opposite = service.compareSubmissionWithExistingReport(
                submission({ type: ReportType.SPEED_TRAP, bearing1: 135 }),
                candidate({ bearing1: 0 }),
            );
            const sideways = service.compareSubmissionWithExistingReport(
                submission({ type: ReportType.SPEED_TRAP, bearing1: 134 }),
                candidate({ bearing1: 0 }),
            );

            expect(opposite.isMatch).toBe(true);
            expect(sideways).toEqual({ isMatch: false, reason: "direction" });
        });

        it("does not add the other side for a one-sided type", () => {
            const result = service.compareSubmissionWithExistingReport(
                submission({ type: ReportType.STATIONARY_VEHICLE, bearing1: 292 }),
                candidate({ bearing1: 112 }),
            );

            expect(result).toEqual({ isMatch: false, reason: "direction" });
        });

        it("rejects a two-sided candidate that already has both sides when the bearing fits neither", () => {
            const result = service.compareSubmissionWithExistingReport(
                submission({ type: ReportType.SPEED_TRAP, bearing1: 137 }),
                candidate({ bearing1: 47, bearing2: 227 }),
            );

            expect(result).toEqual({ isMatch: false, reason: "direction" });
        });
    });
});
