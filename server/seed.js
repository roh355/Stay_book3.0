'use strict';

const crypto = require('node:crypto');
const { db, transaction } = require('./db');
const { hashPassword } = require('./auth');
const { rngFrom } = require('./prng');

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const CAPACITIES = [2, 4, 4, 6, 8, 10, 12];
const FLOORS = 10;
const SLOT_COUNT = 48; // 00:00 -> 24:00 in 30-min slots
const HOSTEL_HORIZON_DAYS = 60;

function now() {
  return new Date().toISOString();
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function ymd(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function addDays(base, days) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function buildRoomsFor(kind) {
  const prefix = kind === 'conference' ? 'c' : 'h';
  const buildingId = `b-${kind}`;
  const rooms = [];
  for (let floor = 1; floor <= FLOORS; floor++) {
    const label = pad2(floor);
    const rng = rngFrom(`${kind}:floor:${floor}`);
    const count = rng.int(6, 10);
    for (let idx = 0; idx < count; idx++) {
      const letter = LETTERS[idx];
      const rr = rngFrom(`${kind}:room:${floor}:${idx}`);
      rooms.push({
        id: `${prefix}-r-${floor}-${idx}`,
        buildingId,
        buildingKind: kind,
        floorNumber: floor,
        floorLabel: label,
        code: `${label}${letter}`,
        capacity: rr.pick(CAPACITIES),
        naturalLight: rr.chance(0.6) ? 1 : 0,
        videoConf: rr.chance(0.5) ? 1 : 0,
        whiteboard: rr.chance(0.7) ? 1 : 0,
      });
    }
  }
  return rooms;
}

function seed() {
  const already = db.prepare('SELECT COUNT(*) AS n FROM buildings').get();
  if (already && already.n > 0) return; // idempotent

  transaction(() => {
    const created = now();

    // ---- Buildings ----
    const buildings = [
      { id: 'b-conference', kind: 'conference', name: 'Skyline Conference Center' },
      { id: 'b-hostel', kind: 'hostel', name: 'Skyline Residences' },
    ];
    const insBuilding = db.prepare(
      'INSERT INTO buildings (id, kind, name, floor_count, created_at) VALUES (?, ?, ?, ?, ?)',
    );
    for (const b of buildings) insBuilding.run(b.id, b.kind, b.name, FLOORS, created);

    // ---- Rooms ----
    const insRoom = db.prepare(
      `INSERT INTO rooms
        (id, building_id, building_kind, building_name, floor_number, floor_label, code, capacity, natural_light, video_conf, whiteboard)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const roomsByKind = {};
    for (const b of buildings) {
      const rooms = buildRoomsFor(b.kind);
      roomsByKind[b.kind] = rooms;
      for (const r of rooms) {
        insRoom.run(
          r.id,
          r.buildingId,
          r.buildingKind,
          b.name,
          r.floorNumber,
          r.floorLabel,
          r.code,
          r.capacity,
          r.naturalLight,
          r.videoConf,
          r.whiteboard,
        );
      }
    }

    // ---- Users ----
    const insUser = db.prepare(
      'INSERT INTO users (id, username, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    );
    const demoUsers = [
      { id: 'u-admin', username: 'admin', name: 'Ada Admin', role: 'admin' },
      { id: 'u-maya', username: 'maya', name: 'Maya Rivera', role: 'user' },
      { id: 'u-leo', username: 'leo', name: 'Leo Nakamura', role: 'user' },
      { id: 'u-priya', username: 'priya', name: 'Priya Sharma', role: 'user' },
    ];
    const pwHash = hashPassword('password');
    for (const u of demoUsers) {
      insUser.run(u.id, u.username, pwHash, u.name, u.role, created);
    }

    // ---- Demo conference bookings (today-2 .. today+30) ----
    const insBooking = db.prepare(
      `INSERT INTO bookings
        (id, room_id, building_id, room_code, date, start_slot, end_slot, topic, user_id, user_name, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?)`,
    );
    const topics = [
      'Sprint planning',
      'Design review',
      '1:1',
      'All-hands',
      'Client call',
      'Retro',
      'Interview',
      'Roadmap sync',
      null,
    ];
    const confRooms = roomsByKind.conference;
    const today = new Date();
    const brng = rngFrom('conference:bookings');
    for (let dayOffset = -2; dayOffset <= 30; dayOffset++) {
      const date = ymd(addDays(today, dayOffset));
      // a handful of bookings per day, spread across rooms
      const perDay = brng.int(4, 9);
      const takenPerRoom = new Map();
      for (let i = 0; i < perDay; i++) {
        const room = brng.pick(confRooms);
        const start = brng.int(0, SLOT_COUNT - 2);
        const len = brng.pick([1, 2, 2, 3, 4]);
        const end = Math.min(SLOT_COUNT, start + len);
        // avoid obvious self-overlap within seed for the same room/day
        const ranges = takenPerRoom.get(room.id) || [];
        const overlaps = ranges.some((r) => start < r[1] && end > r[0]);
        if (overlaps) continue;
        ranges.push([start, end]);
        takenPerRoom.set(room.id, ranges);
        const user = brng.pick(demoUsers);
        insBooking.run(
          `bk-${crypto.randomUUID()}`,
          room.id,
          room.buildingId,
          room.code,
          date,
          start,
          end,
          brng.pick(topics),
          user.id,
          user.name,
          created,
        );
      }
    }

    // ---- Demo hostel stays across the 60-day horizon ----
    const insStay = db.prepare(
      `INSERT INTO stays
        (id, room_id, building_id, room_code, check_in, check_out, guest, user_id, user_name, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?)`,
    );
    const guests = [
      'J. Okafor',
      'S. Bianchi',
      'K. Andersson',
      'R. Haddad',
      null,
      'T. Watanabe',
    ];
    const hostelRooms = roomsByKind.hostel;
    const srng = rngFrom('hostel:stays');
    for (const room of hostelRooms) {
      const takenRanges = [];
      const numStays = srng.int(1, 4);
      for (let i = 0; i < numStays; i++) {
        const checkInOffset = srng.int(0, HOSTEL_HORIZON_DAYS - 2);
        const nights = srng.pick([1, 1, 2, 2, 3, 4, 5]);
        const checkOutOffset = Math.min(
          HOSTEL_HORIZON_DAYS,
          checkInOffset + nights,
        );
        const overlaps = takenRanges.some(
          (r) => checkInOffset < r[1] && checkOutOffset > r[0],
        );
        if (overlaps) continue;
        takenRanges.push([checkInOffset, checkOutOffset]);
        const user = srng.pick(demoUsers);
        insStay.run(
          `st-${crypto.randomUUID()}`,
          room.id,
          room.buildingId,
          room.code,
          ymd(addDays(today, checkInOffset)),
          ymd(addDays(today, checkOutOffset)),
          srng.pick(guests),
          user.id,
          user.name,
          created,
        );
      }
    }
  });

  console.log('[seed] StayBook demo data created.');
}

module.exports = { seed, HOSTEL_HORIZON_DAYS, SLOT_COUNT };
