-- VesselOps database schema (PostgreSQL)
--
-- This file was missing from the repo even though the API code and README
-- both depend on it: routes/certificates.js assumes a trigger sets
-- `status` automatically, routes/watches.js assumes a unique constraint
-- exists to catch double-booked crew (it checks for Postgres error 23505),
-- and every route references columns/tables that were never defined
-- anywhere. Without this file the app cannot run at all on a fresh
-- database. Run this once against your Postgres/Supabase database before
-- starting the API:
--
--   psql "$DATABASE_URL" -f src/db/schema.sql

-- ---------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'officer'
                CHECK (role IN ('admin', 'captain', 'officer', 'cadet')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- vessels
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vessels (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  imo_number  TEXT UNIQUE,
  flag        TEXT,
  vessel_type TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- crew_members
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crew_members (
  id              SERIAL PRIMARY KEY,
  vessel_id       INTEGER NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  rank            TEXT NOT NULL,
  nationality     TEXT,
  contract_start  DATE,
  contract_end    DATE,
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'on_leave', 'signed_off')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crew_members_vessel_id ON crew_members(vessel_id);

-- ---------------------------------------------------------------------
-- watch_schedules
-- Unique constraint powers the 409 "schedule conflict" response in
-- routes/watches.js (Postgres error code 23505).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS watch_schedules (
  id              SERIAL PRIMARY KEY,
  vessel_id       INTEGER NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
  crew_member_id  INTEGER NOT NULL REFERENCES crew_members(id) ON DELETE CASCADE,
  watch_type      TEXT NOT NULL,
  schedule_date   DATE NOT NULL,
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (crew_member_id, schedule_date, start_time)
);

CREATE INDEX IF NOT EXISTS idx_watch_schedules_vessel_date ON watch_schedules(vessel_id, schedule_date);

-- ---------------------------------------------------------------------
-- logbook_entries
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS logbook_entries (
  id          SERIAL PRIMARY KEY,
  vessel_id   INTEGER NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
  created_by  INTEGER NOT NULL REFERENCES users(id),
  entry_time  TIMESTAMPTZ NOT NULL DEFAULT now(),
  latitude    NUMERIC(9,6),
  longitude   NUMERIC(9,6),
  weather     TEXT,
  sea_state   TEXT,
  speed_kn    NUMERIC(5,2),
  course_deg  NUMERIC(5,2),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_logbook_entries_vessel_time ON logbook_entries(vessel_id, entry_time DESC);

-- ---------------------------------------------------------------------
-- certificates
-- status is maintained automatically by the trigger below, matching the
-- comment "// Status is set automatically by the DB trigger" in
-- routes/certificates.js.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS certificates (
  id              SERIAL PRIMARY KEY,
  crew_member_id  INTEGER NOT NULL REFERENCES crew_members(id) ON DELETE CASCADE,
  cert_type       TEXT NOT NULL,
  cert_number     TEXT,
  issue_date      DATE,
  expiry_date     DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'valid'
                  CHECK (status IN ('valid', 'expiring_soon', 'expired')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_certificates_crew_member_id ON certificates(crew_member_id);

CREATE OR REPLACE FUNCTION set_certificate_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expiry_date < CURRENT_DATE THEN
    NEW.status := 'expired';
  ELSIF NEW.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN
    NEW.status := 'expiring_soon';
  ELSE
    NEW.status := 'valid';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_certificate_status ON certificates;
CREATE TRIGGER trg_set_certificate_status
  BEFORE INSERT OR UPDATE OF expiry_date ON certificates
  FOR EACH ROW
  EXECUTE FUNCTION set_certificate_status();
