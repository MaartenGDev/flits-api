import type { Queryable } from "@/db/pool";

export interface ReportRow {
    id: string;
    country: string;
    type: number;
    status: string;
    longitude: number;
    latitude: number;
    bearing1: number;
    bearing2: number | null;
    road: string | null;
    hmp: number | null;
    max_speed: number | null;
    first_spotted: Date;
    last_update: Date;
    user_count: number;
}

export interface CandidateRow extends ReportRow {
    distance_m: number;
}

export interface NewReport {
    country: string;
    type: number;
    lon: number;
    lat: number;
    bearing1: number;
    bearing2: number | null;
    road: string | null;
    hmp: number | null;
    maxSpeed: number | null;
}

export interface NewUserReport extends NewReport {
    reportId: string;
    uid: string;
    userid: string;
    redLight: boolean | null;
    source: string | null;
    language: string | null;
    altitude: number | null;
    speed: number | null;
    gpsPath: unknown[];
    outcome: "created" | "confirmed";
}

export interface NewVote {
    reportId: string;
    uid: string;
    userid: string | null;
    seen: boolean | null;
    automatic: boolean;
    source: string;
    lon: number;
    lat: number;
    heading: number | null;
    speed: number | null;
    gpsPath: unknown[];
}

// `hmp` is NUMERIC, which pg returns as a string; cast it so rows carry a number.
const REPORT_COLUMNS = `
    id, country, type, status,
    ST_X(location::geometry) AS longitude,
    ST_Y(location::geometry) AS latitude,
    bearing1, bearing2, road, hmp::float8 AS hmp, max_speed,
    first_spotted, last_update, user_count`;

const POINT = (lonParam: string, latParam: string) =>
    `ST_SetSRID(ST_MakePoint(${lonParam}, ${latParam}), 4326)::geography`;

export async function findActiveCandidates(
    db: Queryable,
    p: { country: string; type: number; lon: number; lat: number; radiusM: number },
): Promise<CandidateRow[]> {
    const result = await db.query<CandidateRow>(
        `SELECT ${REPORT_COLUMNS},
                ST_Distance(location, ${POINT("$1", "$2")}) AS distance_m
         FROM reports
         WHERE status = 'active' AND country = $3 AND type = $4
           AND ST_DWithin(location, ${POINT("$1", "$2")}, $5)
         ORDER BY distance_m ASC, last_update DESC`,
        [p.lon, p.lat, p.country, p.type, p.radiusM],
    );
    return result.rows;
}

export async function getReport(db: Queryable, id: string): Promise<ReportRow | null> {
    const result = await db.query<ReportRow>(`SELECT ${REPORT_COLUMNS} FROM reports WHERE id = $1`, [id]);
    return result.rows[0] ?? null;
}

export async function listActiveReports(db: Queryable, p: { country?: string } = {}): Promise<ReportRow[]> {
    const result = await db.query<ReportRow>(
        `SELECT ${REPORT_COLUMNS}
         FROM reports
         WHERE status = 'active' AND ($1::text IS NULL OR country = $1)
         ORDER BY last_update DESC`,
        [p.country ?? null],
    );
    return result.rows;
}

export async function insertReport(db: Queryable, p: NewReport): Promise<ReportRow> {
    const result = await db.query<ReportRow>(
        `INSERT INTO reports (country, type, location, bearing1, bearing2, road, hmp, max_speed)
         VALUES ($1, $2, ${POINT("$3", "$4")}, $5, $6, $7, $8, $9)
         RETURNING ${REPORT_COLUMNS}`,
        [p.country, p.type, p.lon, p.lat, p.bearing1, p.bearing2, p.road, p.hmp, p.maxSpeed],
    );
    return result.rows[0]!;
}

/**
 * Counts one more confirmation on an active report. Returns null when the report is no
 * longer active, so the caller can fall back to creating a new one.
 */
export async function confirmReport(
    db: Queryable,
    id: string,
    p: { bearing2?: number } = {},
): Promise<ReportRow | null> {
    const result = await db.query<ReportRow>(
        `UPDATE reports
         SET user_count = user_count + 1,
             last_update = now(),
             bearing2 = COALESCE($2, bearing2)
         WHERE id = $1 AND status = 'active'
         RETURNING ${REPORT_COLUMNS}`,
        [id, p.bearing2 ?? null],
    );
    return result.rows[0] ?? null;
}

export async function archiveReport(db: Queryable, id: string): Promise<ReportRow | null> {
    const result = await db.query<ReportRow>(
        `UPDATE reports
         SET status = 'archived', last_update = now()
         WHERE id = $1 AND status = 'active'
         RETURNING ${REPORT_COLUMNS}`,
        [id],
    );
    return result.rows[0] ?? null;
}

export async function insertUserReport(db: Queryable, p: NewUserReport): Promise<void> {
    await db.query(
        `INSERT INTO user_reports (
             report_id, uid, userid, country, type, location,
             bearing1, bearing2, road, hmp, max_speed, red_light, source, language,
             altitude, speed, gps_path, outcome)
         VALUES ($1, $2, $3, $4, $5, ${POINT("$6", "$7")},
                 $8, $9, $10, $11, $12, $13, $14, $15,
                 $16, $17, $18::jsonb, $19)`,
        [
            p.reportId, p.uid, p.userid, p.country, p.type, p.lon, p.lat,
            p.bearing1, p.bearing2, p.road, p.hmp, p.maxSpeed, p.redLight, p.source, p.language,
            p.altitude, p.speed, JSON.stringify(p.gpsPath), p.outcome,
        ],
    );
}

export async function insertVote(db: Queryable, p: NewVote): Promise<void> {
    await db.query(
        `INSERT INTO report_votes (
             report_id, uid, userid, seen, automatic, source, location, heading, speed, gps_path)
         VALUES ($1, $2, $3, $4, $5, $6, ${POINT("$7", "$8")}, $9, $10, $11::jsonb)`,
        [
            p.reportId, p.uid, p.userid, p.seen, p.automatic, p.source, p.lon, p.lat,
            p.heading, p.speed, JSON.stringify(p.gpsPath),
        ],
    );
}

export async function countNegativeVotes(db: Queryable, reportId: string): Promise<number> {
    const result = await db.query<{ count: string }>(
        `SELECT count(*) AS count FROM report_votes WHERE report_id = $1 AND seen = false`,
        [reportId],
    );
    return Number(result.rows[0]?.count ?? 0);
}
