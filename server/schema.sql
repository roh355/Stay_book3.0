-- StayBook schema. Deliberately denormalized: every row is self-describing so
-- reads never need a join (room rows inline building name + floor label;
-- booking/stay rows inline room_code and user_name).

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user',
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS buildings (
  id          TEXT PRIMARY KEY,
  kind        TEXT NOT NULL,            -- 'conference' | 'hostel'
  name        TEXT NOT NULL,
  floor_count INTEGER NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rooms (
  id            TEXT PRIMARY KEY,
  building_id   TEXT NOT NULL,
  building_kind TEXT NOT NULL,
  building_name TEXT NOT NULL,
  floor_number  INTEGER NOT NULL,       -- 1-based
  floor_label   TEXT NOT NULL,          -- two-digit, e.g. '07'
  code          TEXT NOT NULL,          -- floor_label + letter, e.g. '07C'
  capacity      INTEGER NOT NULL,
  natural_light INTEGER NOT NULL DEFAULT 0,
  video_conf    INTEGER NOT NULL DEFAULT 0,
  whiteboard    INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (building_id) REFERENCES buildings (id)
);

CREATE TABLE IF NOT EXISTS bookings (
  id          TEXT PRIMARY KEY,
  room_id     TEXT NOT NULL,
  building_id TEXT NOT NULL,
  room_code   TEXT NOT NULL,
  date        TEXT NOT NULL,            -- yyyy-mm-dd
  start_slot  INTEGER NOT NULL,         -- inclusive
  end_slot    INTEGER NOT NULL,         -- exclusive
  topic       TEXT,
  user_id     TEXT NOT NULL,
  user_name   TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  notified_rejected INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  FOREIGN KEY (room_id) REFERENCES rooms (id),
  FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS stays (
  id          TEXT PRIMARY KEY,
  room_id     TEXT NOT NULL,
  building_id TEXT NOT NULL,
  room_code   TEXT NOT NULL,
  check_in    TEXT NOT NULL,            -- yyyy-mm-dd, inclusive
  check_out   TEXT NOT NULL,            -- yyyy-mm-dd, exclusive
  guest       TEXT,
  user_id     TEXT NOT NULL,
  user_name   TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  notified_rejected INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  FOREIGN KEY (room_id) REFERENCES rooms (id),
  FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS idx_rooms_building ON rooms (building_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings (date);
CREATE INDEX IF NOT EXISTS idx_stays_room ON stays (room_id);
