-- Up Migration
CREATE EXTENSION IF NOT EXISTS postgis;

-- Merged, served reports. One row per real-world event; submissions are folded into it.
CREATE TABLE reports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country       text NOT NULL,
  type          smallint NOT NULL,
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'expired', 'removed')),
  location      geography(Point, 4326) NOT NULL,
  bearing1      smallint NOT NULL,
  bearing2      smallint,
  road          text,
  hmp           numeric(6,1),
  max_speed     smallint,
  first_spotted timestamptz NOT NULL DEFAULT now(),
  last_update   timestamptz NOT NULL DEFAULT now(),
  user_count    integer NOT NULL DEFAULT 1,   -- confirmations: merged submissions + seen=true votes
  path          geography(LineString, 4326)   -- jams/closures, unused for now
);

CREATE INDEX reports_active_geo ON reports USING GIST (location) WHERE status = 'active';
CREATE INDEX reports_active_key ON reports (country, type)      WHERE status = 'active';

-- Every raw submission, linked to the report it created or confirmed.
CREATE TABLE user_reports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id     uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  uid           text NOT NULL,
  userid        text NOT NULL,
  country       text NOT NULL,
  type          smallint NOT NULL,
  location      geography(Point, 4326) NOT NULL,
  bearing1      smallint NOT NULL,
  bearing2      smallint,
  road          text,
  hmp           numeric(6,1),
  max_speed     smallint,
  red_light     boolean,
  source        text,
  language      text,
  altitude      double precision,
  speed         double precision,
  gps_path      jsonb NOT NULL DEFAULT '[]'::jsonb,
  outcome       text NOT NULL CHECK (outcome IN ('created', 'confirmed')),
  received_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX user_reports_report_id ON user_reports (report_id);

-- Every rating ("is it still there?") of an existing report.
CREATE TABLE report_votes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id     uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  uid           text NOT NULL,
  userid        text,                         -- only when logged in
  seen          boolean,                      -- null when the client dropped the key
  automatic     boolean NOT NULL,
  source        text NOT NULL,                -- payload `report.type`: the UI that answered
  location      geography(Point, 4326) NOT NULL,
  heading       real,
  speed         real,
  gps_path      jsonb NOT NULL DEFAULT '[]'::jsonb,
  received_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX report_votes_report_id ON report_votes (report_id);

-- Down Migration
DROP TABLE IF EXISTS report_votes;
DROP TABLE IF EXISTS user_reports;
DROP TABLE IF EXISTS reports;
