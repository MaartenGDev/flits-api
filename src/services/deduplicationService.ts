import type { Report } from "@/models/report";
import { ReportType } from "@/models/reportType";

// ---- Rules -------------------------------------------------------------------------

export const MERGE_RADIUS_M = 200;

/** Report types where a report from the opposite carriageway is merged as `bearing2`. */
export const TWO_SIDED_TYPES: ReadonlySet<ReportType> = new Set([
    ReportType.SPEED_TRAP,
    ReportType.SPEED_CAM,
    ReportType.TRAFFIC_CAM,
    ReportType.CONTROL,
]);

export const SAME_DIR_MAX_DEG = 45;
export const OPPOSITE_MIN_DEG = 135;

export const ARCHIVE_AFTER_NEGATIVE_VOTES = 2;

export function isTwoSided(type: ReportType): boolean {
    return TWO_SIDED_TYPES.has(type);
}

// ---- Geo helpers ------------------------------------------------------------------

/** Snaps a coordinate to 6 decimals (~0.1 m); the client sends float32 anyway. */
export function snap6(value: number): number {
    return Math.round(value * 1e6) / 1e6;
}

/** Normalises a bearing to an integer in [0, 360). */
export function normaliseBearing(bearing: number): number {
    return ((Math.round(bearing) % 360) + 360) % 360;
}

/** Smallest angle between two bearings, in [0, 180]. */
export function angleDiff(a: number, b: number): number {
    return Math.abs(((a - b + 540) % 360) - 180);
}

// ---- Matching ----------------------------------------------------------------------

export interface Submission {
    country: string;
    type: ReportType;
    lon: number;
    lat: number;
    bearing1: number;
    bearing2: number | null;
    road: string | null;
    hmp: number | null;
    maxSpeed: number | null;
    redLight: boolean | null;
    source: string;
}

export interface Candidate {
    id: string;
    bearing1: number;
    bearing2: number | null;
    distanceM: number;
}

export type MatchResult =
    | { isMatch: true; kind: "already_reported" }
    | { isMatch: true; kind: "also_on_other_side"; bearing2: number }
    | { isMatch: false; reason: "distance" | "direction" };

export function normaliseSubmission(report: Report): Submission {
    return {
        country: report.country_code.toUpperCase(),
        type: report.type_id,
        lon: snap6(report.longitude),
        lat: snap6(report.latitude),
        bearing1: normaliseBearing(report.bearing1),
        bearing2: report.bearing2 === null ? null : normaliseBearing(report.bearing2),
        road: report.road.trim() === "" || report.road === "-" ? null : report.road,
        hmp: typeof report.hmp === "number" ? report.hmp : null,
        maxSpeed: typeof report.max_speed === "number" ? report.max_speed : null,
        redLight: report.red_light,
        source: report.source,
    };
}

/**
 * Decides whether a submission is the same real-world event as an existing report.
 */
export function compareSubmissionWithExistingReport(sub: Submission, candidate: Candidate): MatchResult {
    if (candidate.distanceM > MERGE_RADIUS_M) {
        return { isMatch: false, reason: "distance" };
    }

    const firstBearingAngleDifference = angleDiff(sub.bearing1, candidate.bearing1);
    const secondBearingAngleDifference = candidate.bearing2 === null ? null : angleDiff(sub.bearing1, candidate.bearing2);

    if (firstBearingAngleDifference <= SAME_DIR_MAX_DEG || (secondBearingAngleDifference !== null && secondBearingAngleDifference <= SAME_DIR_MAX_DEG)) {
        return { isMatch: true, kind: "already_reported" };
    }

    if (isTwoSided(sub.type) && candidate.bearing2 === null && firstBearingAngleDifference >= OPPOSITE_MIN_DEG) {
        return { isMatch: true, kind: "also_on_other_side", bearing2: sub.bearing1 };
    }

    return { isMatch: false, reason: "direction" };
}
