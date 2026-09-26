import type { Request, RequestHandler, Response } from "express";
import { pool } from "@/db/pool";
import { ReportVoteSchema } from "@/models/reportVote";
import { UserReportSchema } from "@/models/userReport";
import { listActiveReports } from "@/repositories/reportRepository";
import { reportVoteService } from "@/services/reportVoteService";
import { userReportService } from "@/services/userReportService";

class UserReportController {
    public index: RequestHandler = async (req: Request, res: Response) => {
        const country = typeof req.query.country === "string" ? req.query.country.toUpperCase() : undefined;
        const reports = await listActiveReports(pool, { country });

        res.json(reports);
    };

    public create: RequestHandler = async (req: Request, res: Response) => {
        const parsed = UserReportSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).send({ message: "Invalid user report", issues: parsed.error.issues });
            return;
        }

        const result = await userReportService.addReport(parsed.data);
        res.status(result.outcome === "created" ? 201 : 200).send(result);
    };

    public vote: RequestHandler = async (req: Request, res: Response) => {
        const parsed = ReportVoteSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).send({ message: "Invalid report vote", issues: parsed.error.issues });
            return;
        }

        const result = await reportVoteService.vote(req.params.id as string, parsed.data);
        if (result === null) {
            res.status(404).send({ message: "Report not found" });
            return;
        }

        res.status(200).send(result);
    };
}

export const userReportController = new UserReportController();
