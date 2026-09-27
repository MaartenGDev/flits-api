import type { ReportVote } from "../../src/models/reportVote";
import { ReportType } from "../../src/models/reportType";
import type { UserReport } from "../../src/models/userReport";
import type { CandidateRow, ReportRow } from "../../src/repositories/reportRepository";

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

export function userReportPayload(overrides: DeepPartial<UserReport> = {}): UserReport {
    return {
        user: {
            uid: "device-1",
            language: "nl",
            gps_path: [[4.8721, 52.3376], [4.8729, 52.3381]],
            altitude: 3.2,
            speed: 24.6,
            userid: "user-1",
            ...overrides.user,
        },
        report: {
            country_code: "NL",
            type_id: ReportType.STATIONARY_VEHICLE,
            latitude: 52.338412,
            longitude: 4.873591,
            road: "A10",
            bearing1: 112,
            bearing2: null,
            hmp: 17.4,
            max_speed: null,
            red_light: null,
            source: "test",
            ...overrides.report,
        },
    } as UserReport;
}

export function reportVotePayload(overrides: DeepPartial<ReportVote> = {}): ReportVote {
    return {
        user: {
            uid: "device-4",
            gps_path: [[4.8721, 52.3376], [4.8729, 52.3381]],
            heading: 114.5,
            longitude: 4.873591,
            latitude: 52.338412,
            speed: 19.8,
            ...overrides.user,
        },
        report: {
            seen: false,
            automatic: false,
            type: "citsPopup",
            ...overrides.report,
        },
    } as ReportVote;
}

export function reportRow(overrides: Partial<ReportRow> = {}): ReportRow {
    return {
        id: "859eea74-f9ab-4fd8-8b92-24ac1c31b3ed",
        country: "NL",
        type: ReportType.STATIONARY_VEHICLE,
        status: "active",
        longitude: 4.873591,
        latitude: 52.338412,
        bearing1: 112,
        bearing2: null,
        road: "A10",
        hmp: 17.4,
        max_speed: null,
        first_spotted: new Date("2026-09-26T15:39:37.463Z"),
        last_update: new Date("2026-09-26T15:39:52.108Z"),
        user_count: 1,
        ...overrides,
    };
}

export function candidateRow(overrides: Partial<CandidateRow> = {}): CandidateRow {
    return { ...reportRow(), distance_m: 12.5, ...overrides };
}
