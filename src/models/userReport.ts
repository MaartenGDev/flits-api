import { z } from "zod";

import { ReportSchema } from "./report";
import { UserSchema } from "./user";

export type UserReport = z.infer<typeof UserReportSchema>;
export const UserReportSchema = z.object({
    user: UserSchema,
    report: ReportSchema,
});
