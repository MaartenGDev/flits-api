import {withTransaction} from "@/db/pool";
import type {ReportVote} from "@/models/reportVote";
import {
    archiveReport,
    confirmReport,
    countNegativeVotes,
    getReport,
    insertVote,
    type ReportRow,
} from "@/repositories/reportRepository";
import { snap6 } from "@/utils/geo";

export type VoteOutcome = "confirmed" | "archived" | "recorded";

export interface VoteResult {
    outcome: VoteOutcome;
    report: ReportRow;
}

export class ReportVoteService {
    private readonly archiveAfterNegativeVotes = 2;

    public async vote(reportId: string, vote: ReportVote): Promise<VoteResult | null> {
        return withTransaction(async (client) => {
            let report = await getReport(client, reportId);
            if (report === null) {
                return null;
            }

            await insertVote(client, {
                reportId: report.id,
                uid: vote.user.uid,
                userid: vote.user.userid ?? null,
                seen: vote.report.seen ?? null,
                automatic: vote.report.automatic,
                source: vote.report.type,
                lon: snap6(vote.user.longitude),
                lat: snap6(vote.user.latitude),
                heading: vote.user.heading,
                speed: vote.user.speed,
                gpsPath: vote.user.gps_path,
            });

            if (report.status !== "active") {
                return {outcome: "recorded", report};
            }

            if (vote.report.seen) {
                const confirmedReport = await confirmReport(client, report.id);

                return {
                    outcome: confirmedReport ? "confirmed" : "recorded",
                    report: confirmedReport ?? report
                }
            }

            const negativeVoteCount = await countNegativeVotes(client, report.id);

            if (negativeVoteCount < this.archiveAfterNegativeVotes) {
                return {outcome: "recorded", report};
            }

            const archivedReport = await archiveReport(client, report.id);

            return {
                outcome: archivedReport ? "archived" : "recorded",
                report: archivedReport ?? report
            }
        });
    }
}

export const reportVoteService = new ReportVoteService();
