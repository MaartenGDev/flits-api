import type { Logger } from "pino";

import type { Db } from "../db/database";
import type { UserReport } from "../models/userReport";
import type { ReportRepository, ReportRow } from "../repositories/reportRepository";
import type { DeduplicationService } from "./deduplicationService";

export type AddReportOutcome = "created" | "confirmed";

export interface AddReportResult {
    outcome: AddReportOutcome;
    report: ReportRow;
}

export class UserReportService {
    constructor(
        private readonly db: Db,
        private readonly reports: ReportRepository,
        private readonly deduplication: DeduplicationService,
        private readonly logger: Logger,
    ) {}

    public listActiveReports(p: { country?: string } = {}): Promise<ReportRow[]> {
        return this.reports.listActiveReports(this.db, p);
    }

    /**
     * Stores a submission and either folds it into a nearby active report of the same
     * type and direction, or creates a new report.
     */
    public async addReport(userReport: UserReport): Promise<AddReportResult> {
        const sub = this.deduplication.normaliseSubmission(userReport.report);
        const user = userReport.user;

        return this.db.withTransaction(async (client) => {
            const candidates = await this.reports.findActiveCandidates(client, {
                country: sub.country,
                type: sub.type,
                lon: sub.lon,
                lat: sub.lat,
                radiusM: this.deduplication.mergeRadiusM,
            });

            let existingReport: ReportRow | null = null;
            let matchKind: string | null = null;

            for (const candidate of candidates) {
                const matchResult = this.deduplication.compareSubmissionWithExistingReport(sub, {
                    id: candidate.id,
                    bearing1: candidate.bearing1,
                    bearing2: candidate.bearing2,
                    distanceM: candidate.distance_m,
                });

                if (!matchResult.isMatch) {
                    continue;
                }

                existingReport = matchResult.kind === "also_on_other_side"
                    ? await this.reports.confirmReport(client, candidate.id, { bearing2: matchResult.bearing2 })
                    : await this.reports.confirmReport(client, candidate.id);

                if (existingReport !== null) {
                    matchKind = matchResult.kind;
                    break;
                }
            }

            const outcome: AddReportOutcome = existingReport === null ? "created" : "confirmed";

            if (existingReport === null) {
                existingReport = await this.reports.insertReport(client, sub);
            }

            await this.reports.insertUserReport(client, {
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

            this.logger.info(
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
