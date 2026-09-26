import { z } from "zod";

// A single GPS coordinate as [longitude, latitude].
export type GpsPoint = z.infer<typeof GpsPointSchema>;
export const GpsPointSchema = z.tuple([z.number(), z.number()]);

export type User = z.infer<typeof UserSchema>;
export const UserSchema = z.object({
    uid: z.string(),
    language: z.string(),
    gps_path: z.array(GpsPointSchema).max(1000),
    altitude: z.number(),
    speed: z.number(),
    userid: z.string(),
});
