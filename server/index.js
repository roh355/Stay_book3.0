'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const cors = require('cors');

const { db, init } = require('./db');
const { seed } = require('./seed');
const {
  hashPassword,
  verifyPassword,
  signToken,
  attachUser,
  requireAuth,
} = require('./auth');

const app = express();
app.use(cors());
app.use(express.json());
app.use(attachUser);

// Angular production build (ng build → dist/staybook/browser)
const distDir = path.join(__dirname, '..', 'dist', 'staybook', 'browser');

// ---------- mappers ----------
function mapRoom(row) {
  return {
    id: row.id,
    code: row.code,
    floor: row.floor_number,
    capacity: row.capacity,
    amenities: {
      naturalLight: !!row.natural_light,
      videoConf: !!row.video_conf,
      whiteboard: !!row.whiteboard,
    },
  };
}

async function floorsFor(kind) {
  const building = await db
    .prepare('SELECT * FROM buildings WHERE kind = ?')
    .get(kind);
  if (!building) return [];
  const rooms = await db
    .prepare(
      'SELECT * FROM rooms WHERE building_id = ? ORDER BY floor_number, code',
    )
    .all(building.id);
  const byFloor = new Map();
  for (const r of rooms) {
    if (!byFloor.has(r.floor_number)) {
      byFloor.set(r.floor_number, {
        number: r.floor_number,
        label: r.floor_label,
        rooms: [],
      });
    }
    byFloor.get(r.floor_number).rooms.push(mapRoom(r));
  }
  const floors = [];
  for (let n = 1; n <= building.floor_count; n++) {
    floors.push(byFloor.get(n) || { number: n, label: String(n).padStart(2, '0'), rooms: [] });
  }
  return floors;
}

function mapBooking(row) {
  return {
    id: row.id,
    roomId: row.room_id,
    roomCode: row.room_code,
    date: row.date,
    startSlot: row.start_slot,
    endSlot: row.end_slot,
    topic: row.topic || undefined,
    userId: row.user_id,
    userName: row.user_name,
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapStay(row) {
  return {
    id: row.id,
    roomId: row.room_id,
    roomCode: row.room_code,
    checkIn: row.check_in,
    checkOut: row.check_out,
    guest: row.guest || undefined,
    userId: row.user_id,
    userName: row.user_name,
    status: row.status,
    createdAt: row.created_at,
  };
}

function publicUser(row) {
  return { id: row.id, username: row.username, name: row.name, role: row.role };
}

// ---------- auth ----------
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, name } = req.body || {};
    if (!username || String(username).trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters.' });
    }
    if (!password || String(password).length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters.' });
    }
    const uname = String(username).trim();
    const existing = await db.prepare('SELECT id FROM users WHERE username = ?').get(uname);
    if (existing) return res.status(409).json({ error: 'That username is taken.' });

    const user = {
      id: `u-${crypto.randomUUID()}`,
      username: uname,
      name: (name && String(name).trim()) || uname,
      role: 'user',
    };
    await db.prepare(
      'INSERT INTO users (id, username, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(user.id, user.username, hashPassword(password), user.name, user.role, new Date().toISOString());

    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const row = await db
      .prepare('SELECT * FROM users WHERE username = ?')
      .get(String(username || '').trim());
    if (!row || !verifyPassword(String(password || ''), row.password_hash)) {
      return res.status(401).json({ error: 'Wrong username or password.' });
    }
    const user = publicUser(row);
    res.json({ token: signToken(user), user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const row = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!row) return res.status(401).json({ error: 'Session expired.' });
    res.json({ user: publicUser(row) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Session check failed.' });
  }
});

// ---------- floors ----------
app.get('/api/conference/floors', async (_req, res) => {
  try {
    res.json(await floorsFor('conference'));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load floors.' });
  }
});
app.get('/api/hostel/floors', async (_req, res) => {
  try {
    res.json(await floorsFor('hostel'));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load floors.' });
  }
});

// ---------- conference bookings ----------
app.get('/api/bookings', async (req, res) => {
  try {
    const { date } = req.query;
    const rows = date
      ? await db.prepare('SELECT * FROM bookings WHERE "date" = ? ORDER BY start_slot').all(date)
      : await db.prepare('SELECT * FROM bookings ORDER BY "date", start_slot').all();
    res.json(rows.map(mapBooking));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load bookings.' });
  }
});

app.get('/api/bookings/mine', requireAuth, async (req, res) => {
  try {
    const rows = await db
      .prepare('SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC')
      .all(req.user.id);
    res.json(rows.map(mapBooking));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load bookings.' });
  }
});

app.post('/api/bookings', requireAuth, async (req, res) => {
  try {
    const { roomId, date, startSlot, endSlot, topic } = req.body || {};
    const start = Number(startSlot);
    const end = Number(endSlot);
    if (!roomId || !date || !Number.isInteger(start) || !Number.isInteger(end) || end <= start) {
      return res.status(400).json({ error: 'Invalid booking request.' });
    }
    const room = await db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
    if (!room) return res.status(404).json({ error: 'Room not found.' });

    const clash = await db
      .prepare(
        `SELECT id FROM bookings WHERE room_id = ? AND "date" = ? AND start_slot < ? AND end_slot > ? AND status != 'rejected'`,
      )
      .get(roomId, date, end, start);
    if (clash) return res.status(409).json({ error: 'That time was just taken.' });

    const booking = {
      id: `bk-${crypto.randomUUID()}`,
      room_id: room.id,
      building_id: room.building_id,
      room_code: room.code,
      date,
      start_slot: start,
      end_slot: end,
      topic: (topic && String(topic).trim()) || null,
      user_id: req.user.id,
      user_name: req.user.name,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    await db.prepare(
      `INSERT INTO bookings
        (id, room_id, building_id, room_code, "date", start_slot, end_slot, topic, user_id, user_name, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      booking.id, booking.room_id, booking.building_id, booking.room_code,
      booking.date, booking.start_slot, booking.end_slot, booking.topic,
      booking.user_id, booking.user_name, booking.status, booking.created_at,
    );
    res.status(201).json(mapBooking(booking));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Booking failed.' });
  }
});

app.delete('/api/bookings/:id', requireAuth, async (req, res) => {
  try {
    const row = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Booking not found.' });
    if (row.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not your booking.' });
    }
    await db.prepare('DELETE FROM bookings WHERE id = ?').run(req.params.id);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed.' });
  }
});

// ---------- hostel stays ----------
app.get('/api/stays', async (_req, res) => {
  try {
    const rows = await db.prepare('SELECT * FROM stays ORDER BY check_in').all();
    res.json(rows.map(mapStay));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load stays.' });
  }
});

app.get('/api/stays/mine', requireAuth, async (req, res) => {
  try {
    const rows = await db
      .prepare('SELECT * FROM stays WHERE user_id = ? ORDER BY created_at DESC')
      .all(req.user.id);
    res.json(rows.map(mapStay));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load stays.' });
  }
});

app.post('/api/stays', requireAuth, async (req, res) => {
  try {
    const { roomId, checkIn, checkOut, guest } = req.body || {};
    if (!roomId || !checkIn || !checkOut || checkOut <= checkIn) {
      return res.status(400).json({ error: 'Invalid stay request.' });
    }
    const room = await db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
    if (!room) return res.status(404).json({ error: 'Room not found.' });

    const clash = await db
      .prepare(
        `SELECT id FROM stays WHERE room_id = ? AND check_in < ? AND check_out > ? AND status != 'rejected'`,
      )
      .get(roomId, checkOut, checkIn);
    if (clash) return res.status(409).json({ error: 'Those nights were just taken.' });

    const stay = {
      id: `st-${crypto.randomUUID()}`,
      room_id: room.id,
      building_id: room.building_id,
      room_code: room.code,
      check_in: checkIn,
      check_out: checkOut,
      guest: (guest && String(guest).trim()) || null,
      user_id: req.user.id,
      user_name: req.user.name,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    await db.prepare(
      `INSERT INTO stays
        (id, room_id, building_id, room_code, check_in, check_out, guest, user_id, user_name, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      stay.id, stay.room_id, stay.building_id, stay.room_code,
      stay.check_in, stay.check_out, stay.guest,
      stay.user_id, stay.user_name, stay.status, stay.created_at,
    );
    res.status(201).json(mapStay(stay));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Stay booking failed.' });
  }
});

app.delete('/api/stays/:id', requireAuth, async (req, res) => {
  try {
    const row = await db.prepare('SELECT * FROM stays WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Stay not found.' });
    if (row.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not your stay.' });
    }
    await db.prepare('DELETE FROM stays WHERE id = ?').run(req.params.id);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed.' });
  }
});

// ---------- admin approval ----------
app.get('/api/admin/requests', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only.' });
    }
    const bookings = await db.prepare("SELECT * FROM bookings WHERE status = 'pending' ORDER BY created_at").all();
    const stays = await db.prepare("SELECT * FROM stays WHERE status = 'pending' ORDER BY created_at").all();
    res.json({
      bookings: bookings.map(mapBooking),
      stays: stays.map(mapStay)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load requests.' });
  }
});

app.post('/api/admin/requests/:type/:id/:action', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only.' });
    }
    const { type, id, action } = req.params;
    const status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : null;
    if (!status || (type !== 'bookings' && type !== 'stays')) {
      return res.status(400).json({ error: 'Invalid parameters.' });
    }

    const table = type === 'bookings' ? 'bookings' : 'stays';
    const info = await db.prepare(`UPDATE ${table} SET status = ? WHERE id = ? AND status = 'pending'`).run(status, id);
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Pending request not found.' });
    }
    res.json({ success: true, status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Update failed.' });
  }
});

// ---------- rejected polling ----------
app.get('/api/bookings/rejected/poll', requireAuth, async (req, res) => {
  try {
    const rejectedBookings = await db.prepare("SELECT * FROM bookings WHERE user_id = ? AND status = 'rejected' AND notified_rejected = 0").all(req.user.id);
    const rejectedStays = await db.prepare("SELECT * FROM stays WHERE user_id = ? AND status = 'rejected' AND notified_rejected = 0").all(req.user.id);

    if (rejectedBookings.length > 0) {
      const ids = rejectedBookings.map((b) => b.id);
      await db.prepare(
        `UPDATE bookings SET notified_rejected = 1 WHERE id = ANY(?::text[])`,
      ).run(ids);
    }
    if (rejectedStays.length > 0) {
      const ids = rejectedStays.map((s) => s.id);
      await db.prepare(
        `UPDATE stays SET notified_rejected = 1 WHERE id = ANY(?::text[])`,
      ).run(ids);
    }

    res.json({
      bookings: rejectedBookings.map(mapBooking),
      stays: rejectedStays.map(mapStay)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Poll failed.' });
  }
});

// ---------- static SPA (production / Render) ----------
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir, { index: false }));
  app.get(/^(?!\/api(?:\/|$)).*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// ---------- boot ----------
async function boot() {
  await init();
  await seed();
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    const mode = fs.existsSync(distDir) ? 'API + web' : 'API only';
    console.log(`[staybook] ${mode} listening on http://localhost:${PORT}`);
  });
}

boot().catch((err) => {
  console.error('[staybook] Failed to start:', err);
  process.exit(1);
});
