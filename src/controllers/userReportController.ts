import type { Request, RequestHandler, Response } from "express";

import { ReportVoteSchema } from "../models/reportVote";
import { UserReportSchema } from "../models/userReport";
import type { ReportVoteService } from "../services/reportVoteService";
import type { UserReportService } from "../services/userReportService";

export class UserReportController {
    constructor(
        private readonly userReportService: UserReportService,
        private readonly reportVoteService: ReportVoteService,
    ) {}

    public index: RequestHandler = async (req: Request, res: Response) => {
        const country = typeof req.query.country === "string" ? req.query.country.toUpperCase() : undefined;
        const reports = await this.userReportService.listActiveReports({ country });

        res.json(reports);
    };

    public create: RequestHandler = async (req: Request, res: Response) => {
        const parsed = UserReportSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).send({ message: "Invalid user report", issues: parsed.error.issues });
            return;
        }

        const result = await this.userReportService.addReport(parsed.data);
        res.status(result.outcome === "created" ? 201 : 200).send(result);
    };

    public vote: RequestHandler = async (req: Request, res: Response) => {
        const parsed = ReportVoteSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).send({ message: "Invalid report vote", issues: parsed.error.issues });
            return;
        }

        const result = await this.reportVoteService.vote(req.params.id as string, parsed.data);
        if (result === null) {
            res.status(404).send({ message: "Report not found" });
            return;
        }

        res.status(200).send(result);
    };
}
