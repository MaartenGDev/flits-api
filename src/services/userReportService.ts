import { withTransaction } from "@/db/pool";
import { logger } from "@/middleware/logger";
import type { UserReport } from "@/models/userReport";
import {
    confirmReport,
    findActiveCandidates,
    insertReport,
    insertUserReport,
    type ReportRow,
} from "@/repositories/reportRepository";
import { deduplicationService } from "@/services/deduplicationService";

export type AddReportOutcome = "created" | "confirmed";

export interface AddReportResult {
    outcome: AddReportOutcome;
    report: ReportRow;
}

export class UserReportService {
    /**
     * Stores a submission and either folds it into a nearby active report of the same
     * type and direction, or creates a new report.
     */
    public async addReport(userReport: UserReport): Promise<AddReportResult> {
        const sub = deduplicationService.normaliseSubmission(userReport.report);
        const user = userReport.user;

        return withTransaction(async (client) => {
            const candidates = await findActiveCandidates(client, {
                country: sub.country,
                type: sub.type,
                lon: sub.lon,
                lat: sub.lat,
                radiusM: deduplicationService.mergeRadiusM,
            });

            let existingReport: ReportRow | null = null;
            let matchKind: string | null = null;

            for (const candidate of candidates) {
                const matchResult = deduplicationService.compareSubmissionWithExistingReport(sub, {
                    id: candidate.id,
                    bearing1: candidate.bearing1,
                    bearing2: candidate.bearing2,
                    distanceM: candidate.distance_m,
                });

                if (!matchResult.isMatch) {
                    continue;
                }

                existingReport = matchResult.kind === "also_on_other_side"
                    ? await confirmReport(client, candidate.id, { bearing2: matchResult.bearing2 })
                    : await confirmReport(client, candidate.id);

                if (existingReport !== null) {
                    matchKind = matchResult.kind;
                    break;
                }
            }

            const outcome: AddReportOutcome = existingReport === null ? "created" : "confirmed";

            if(existingReport == null) {
                existingReport = await insertReport(client, sub);
            }

            await insertUserReport(client, {
                ...sub,
                reportId: existingReport.id,
                uid: user.uid,
                userid: user.userid,
                language: user.language,
                altitude: user.altitude,
                speed: user.speed,
                gpsPath: user.gps_path,
                outcome,
            });

            logger.info(
                {
                    outcome,
                    reportId: existingReport.id,
                    type: sub.type,
                    country: sub.country,
                    candidates: candidates.length,
                    match: matchKind,
                },
                "user report processed",
            );

            return { outcome, report: existingReport };
        });
    }
}

export const userReportService = new UserReportService();
