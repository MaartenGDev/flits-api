import { z } from "zod";

import { ReportSchema } from "@/models/report";
import { UserSchema } from "@/models/user";

export type UserReport = z.infer<typeof UserReportSchema>;
export const UserReportSchema = z.object({
    user: UserSchema,
    report: ReportSchema,
});
