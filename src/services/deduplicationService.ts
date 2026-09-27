import type { Report } from "../models/report";
import { ReportType } from "../models/reportType";
import { angleDiff, normaliseBearing, snap6 } from "../utils/geo";

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

export class DeduplicationService {
    public readonly mergeRadiusM = 200;

    private readonly sameDirectionMaxDeg = 45;
    private readonly oppositeMinDeg = 135;

    private readonly twoSidedTypes: ReadonlySet<ReportType> = new Set([
        ReportType.SPEED_TRAP,
        ReportType.SPEED_CAM,
        ReportType.TRAFFIC_CAM,
        ReportType.CONTROL,
    ]);

    public isTwoSided(type: ReportType): boolean {
        return this.twoSidedTypes.has(type);
    }

    public normaliseSubmission(report: Report): Submission {
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
    public compareSubmissionWithExistingReport(sub: Submission, candidate: Candidate): MatchResult {
        if (candidate.distanceM > this.mergeRadiusM) {
            return { isMatch: false, reason: "distance" };
        }

        const firstBearingAngleDifference = angleDiff(sub.bearing1, candidate.bearing1);
        const secondBearingAngleDifference = candidate.bearing2 === null ? null : angleDiff(sub.bearing1, candidate.bearing2);

        if (firstBearingAngleDifference <= this.sameDirectionMaxDeg || (secondBearingAngleDifference !== null && secondBearingAngleDifference <= this.sameDirectionMaxDeg)) {
            return { isMatch: true, kind: "already_reported" };
        }

        if (this.isTwoSided(sub.type) && candidate.bearing2 === null && firstBearingAngleDifference >= this.oppositeMinDeg) {
            return { isMatch: true, kind: "also_on_other_side", bearing2: sub.bearing1 };
        }

        return { isMatch: false, reason: "direction" };
    }
}
