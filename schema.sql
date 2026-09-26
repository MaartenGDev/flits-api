CREATE TABLE `speedTraps`
(
    `id`               TEXT    NOT NULL,
    `latitude`         REAL    NOT NULL,
    `longitude`        REAL    NOT NULL,
    `bearing1`         REAL,
    `bearing2`         REAL,
    `city`             TEXT,
    `directionText`    TEXT,
    `road`             TEXT,
    `country`          INTEGER NOT NULL,
    `geoHash`          TEXT    NOT NULL,
    `hectometer`       REAL,
    `firstSpottedTime` TEXT,
    `lastUpdateTime`   TEXT,
    `userCount`        INTEGER NOT NULL,
    `freeJson`         TEXT,
    `deepGeoHash`      TEXT    NOT NULL,
    PRIMARY KEY (`id`, `country`)
);
CREATE INDEX `index_speedTraps_geoHash` ON `speedTraps` (`geoHash`);

CREATE TABLE `reportGeoHash`
(
    `reportId`   TEXT    NOT NULL,
    `reportType` INTEGER NOT NULL,
    `geoHash`    TEXT    NOT NULL,
    `country`    INTEGER NOT NULL,
    PRIMARY KEY (`reportId`, `reportType`, `geoHash`, `country`)
);

CREATE TABLE `incidents`
(
    `id`             TEXT    NOT NULL,
    `latitude`       REAL    NOT NULL,
    `longitude`      REAL    NOT NULL,
    `bearing1`       REAL,
    `bearing2`       REAL,
    `city`           TEXT,
    `road`           TEXT,
    `directionText`  TEXT,
    `polylineJson`   TEXT    NOT NULL,
    `country`        INTEGER NOT NULL,
    `geoHash`        TEXT    NOT NULL,
    `type`           INTEGER NOT NULL,
    `alertCodes`     TEXT    NOT NULL,
    `freeText`       TEXT,
    `updateCount`    INTEGER NOT NULL,
    `isRateAble`     INTEGER NOT NULL,
    `shouldSignal`   INTEGER NOT NULL,
    `extraJson`      TEXT,
    `maxSpeed`       INTEGER,
    `voiceOnlyText`  TEXT,
    `apiSource`      INTEGER NOT NULL,
    `deepGeoHash`    TEXT    NOT NULL,
    `geoHashes`      TEXT    NOT NULL,
    `startTime`      INTEGER,
    `lastUpdateTime` INTEGER,
    PRIMARY KEY (`id`, `type`, `country`)
);
CREATE INDEX `index_incidents_geoHash` ON `incidents` (`geoHash`);
