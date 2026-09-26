# HTTP examples

Manual checks for the reports API, e.g. from Postman or curl.

Setup:

```bash
cp .env.example .env      # once
npm run db:up             # start Postgres/PostGIS
npm run migrate           # create the tables
npm run dev               # API on http://localhost:8080
```

Every request below needs the header `Content-Type: application/json`.

## 1. Create a report

`POST http://localhost:8080/reports`

```json
{
  "user": {
    "uid": "device-1",
    "language": "nl",
    "gps_path": [[4.8721, 52.3376], [4.8729, 52.3381]],
    "altitude": 3.2,
    "speed": 24.6,
    "userid": "user-1"
  },
  "report": {
    "country_code": "NL",
    "type_id": 3,
    "latitude": 52.338412,
    "longitude": 4.873591,
    "road": "A10",
    "bearing1": 112,
    "bearing2": null,
    "hmp": 17.4,
    "max_speed": null,
    "red_light": null,
    "source": "postman"
  }
}
```

Expected: `201` with `outcome: "created"` and `report.user_count: 1`. Copy `report.id`
for the vote requests.

`type_id` values: `0` speed trap, `1` accident, `3` stationary vehicle, `4` roadworks,
`5` obstacle (see `src/models/reportType.ts` for the full list).

## 2. Confirm the same report

Send the request from step 1 again with another `uid`:

```json
{
  "user": {
    "uid": "device-2",
    "language": "nl",
    "gps_path": [[4.8718, 52.3374], [4.8726, 52.3379]],
    "altitude": 3.0,
    "speed": 22.1,
    "userid": "user-2"
  },
  "report": {
    "country_code": "NL",
    "type_id": 3,
    "latitude": 52.338467,
    "longitude": 4.873702,
    "road": "A10",
    "bearing1": 118,
    "bearing2": null,
    "hmp": 17.4,
    "max_speed": null,
    "red_light": null,
    "source": "postman"
  }
}
```

Expected: `200` with `outcome: "confirmed"`, the same `report.id` and `user_count: 2`.
The position is a few metres off and the bearing differs by 6°, both within the merge
rules (200 m, 45°).

Variations on this body:

| Change | Expected |
|---|---|
| `bearing1: 292` (opposite direction) | `201 created`: a stationary vehicle is one-sided, so the other carriageway is a new report |
| `latitude: 52.3410` (about 290 m north) | `201 created`: outside the 200 m radius |
| `type_id: 1` | `201 created`: different type, same spot |
| `bearing1: null` | `400`, `issues[0].path` is `["report", "bearing1"]` |

## 3. Speed trap with two directions

`POST http://localhost:8080/reports`, first with `bearing1: 47`, then again with
`bearing1: 227`:

```json
{
  "user": {
    "uid": "device-3",
    "language": "nl",
    "gps_path": [[5.4802, 51.4419], [5.4811, 51.4425]],
    "altitude": 18.7,
    "speed": 31.2,
    "userid": "user-3"
  },
  "report": {
    "country_code": "NL",
    "type_id": 0,
    "latitude": 51.442833,
    "longitude": 5.481657,
    "road": "A2",
    "bearing1": 47,
    "bearing2": null,
    "hmp": 161.8,
    "max_speed": 100,
    "red_light": false,
    "source": "postman"
  }
}
```

Expected: first `201 created` with `bearing2: null`; second (bearing 227) `200 confirmed`
on the same id with `bearing2: 227`. Speed traps are two-sided, so the opposite
carriageway is merged into the existing report instead of creating a new one.

## 4. Vote on a report

`POST http://localhost:8080/reports/<report.id>/votes`

```json
{
  "user": {
    "uid": "device-4",
    "gps_path": [[4.8721, 52.3376], [4.8729, 52.3381]],
    "heading": 114.5,
    "longitude": 4.873591,
    "latitude": 52.338412,
    "speed": 19.8
  },
  "report": {
    "seen": false,
    "automatic": false,
    "type": "citsPopup"
  }
}
```

Expected sequence on an active report:

| Send | `report.seen` | Response |
|---|---|---|
| any | `true` | `200`, `outcome: "confirmed"`, `user_count` + 1 |
| 1st | `false` | `200`, `outcome: "recorded"`, `report.status: "active"` |
| 2nd | `false` | `200`, `outcome: "archived"`, `report.status: "archived"` |
| after archive | anything | `200`, `outcome: "recorded"`, nothing changes |

Unknown id (`/reports/00000000-0000-0000-0000-000000000000/votes`) gives `404`.

## 5. List active reports

`GET http://localhost:8080/reports?country=NL`

Returns the active reports, newest update first, with `longitude`/`latitude` as numbers.
An archived report is no longer listed, and a new submission at its spot creates a fresh
report.
