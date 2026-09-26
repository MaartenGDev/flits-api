import { z } from "zod";

import { GpsPointSchema } from "@/models/user";

export type ReportVote = z.infer<typeof ReportVoteSchema>;
export const ReportVoteSchema = z.object({
    user: z.object({
        uid: z.string().min(1),
        // Only present when the user is logged in.
        userid: z.string().optional(),
        gps_path: z.array(GpsPointSchema).max(1000),
        heading: z.number(),
        longitude: z.number().min(-180).max(180),
        latitude: z.number().min(-90).max(90),
        speed: z.number(),
    }),
    report: z.object({
        seen: z.boolean(),
        // true only for the automatic road-closure down-vote.
        automatic: z.boolean(),
        type: z.string().min(1),
    }),
});
