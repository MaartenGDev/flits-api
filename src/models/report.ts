import { z } from "zod";

import { ReportType } from "@/models/reportType";

export type Report = z.infer<typeof ReportSchema>;
export const ReportSchema = z.object({
    country_code: z.string().min(2).max(3),
    type_id: z.enum(ReportType),
    longitude: z.number().min(-180).max(180),
    latitude: z.number().min(-90).max(90),
    road: z.string(),
    bearing1: z.number().int(),
    bearing2: z.number().int().nullable(),
    // Either a speed limit in km/h or "-" when unknown / not applicable.
    max_speed: z.union([z.number().int(), z.literal("-")]).nullable(),
    // Hectometre marker on numbered roads, "-" when unknown.
    hmp: z.union([z.number(), z.literal("-")]).nullable(),
    red_light: z.boolean().nullable(),
    source: z.string(),
});
