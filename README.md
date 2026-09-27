# Flits API
NodeJS API that accepts user reports and voting.

## Prerequisites
- Docker runtime (like Docker desktop)
  - **or** a local postgres instance with postgis extension
## Setup
1. Copy `.env.example` to `.env`
2. Run `npm i`
3. Run `npm run migrate` (to setup the postgres database)
4. Run `npm run docker:up` (or run `npm run dev` with local postgres instance)

## Testing
- `npm test` runs the unit tests (Vitest). They need neither Docker nor a `.env` file.
- `npm run test:watch` re-runs them on change.
- Tests live in `tests/` and mirror the `src/` layout; shared builders and fakes are in `tests/support/`.
- See `HTTP_EXAMPLES.md` for manual http requests against a running instance.

# Decisions
## Postgres (postgis) as database
- Chosen because of the geo support (distance calculations based on lat-lon)
- Native scaling support with replication
- ACID compliant

## Using lat / lon instead of geohash
- Lat/lon enables "give me everything in 20 meters", with geohash (5km box) we might miss a report that is just outside the box 

## Postgres + snapshot.json
- Postgres database to store current and historical data (with relations)
- Sending all traffic to `/reports` and thus Postgres would require complicated (and expensive) scaling. Serving a static (cacheable) file solves this.
- `snapshot.json` containing all active reports
  - static asset that can be served to many concurrent clients
    - to be served to the app through CDN / S3
  - generated periodically based on postgres content

### Postgres instead of just snapshot.json
- Postgres makes the de-duplication easier because it can handle lat/lon
- The database can be updated by other applications (for example an CMS) to let admins manually add/edit reports

## Merging reports based on type, distance and country
- if a report of the same type and country is created within 200 meters of the original report no second report is created
  - The `user_count` of the existing report is increased (same as someone pressing seen through the app)
  - And if the "duplicate" report is created from the other driving direction it sets `bearing2` on the existing report

# Out of scope
- A background service that checks when a report was last confirmed and removes it when it has become stale
- A background service that generates the snapshot.json based on the postgres contents

# Assumptions
## Reports
- At a given moment there are around 400 active reports, peak will be 2000 active reports
- Because of the background cleanup service the userReports table will stay limited in size
- There are reports that are kept for many days because for ongoing maintenance

# Future improvements
- add json error handler for 400/500 errors returned from the api
- integration tests against a real PostGIS (testcontainers) for the repository and the http layer
- use an ORM for accessing the postgres database
- write snapshot.json to S3
