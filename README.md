# StayBook

A room-booking demo with two modes:

- **Conferences** — book Skyline Conference Center rooms by half-hour slots (08:00–20:00).
- **Hostels** — book Skyline Residences by night across a 60-day horizon.

Features an interactive **Three.js building**, top-down floor plans, light/dark themes, JWT auth, and SQLite persistence.

## Quick start

```bash
npm install
npm run dev
```

This starts both:

- **API** at `http://localhost:3001`
- **Web** at `http://localhost:4200` (proxies `/api` → the API)

Both must be running — without the API, floors show “No rooms on this floor”.

## Demo account

| Username | Password |
|----------|----------|
| `admin`  | `password` |

## Workflows

### Conference booking

1. Pick a **date** and **From/To** time window.
2. Select a **floor** in the 3D building (or use ↑/↓ keys).
3. Click an **Available** room on the floor plan.
4. Drag a free range on the slot ribbon, optionally add a topic, then **Confirm booking**.

### Hostel stay

1. Set **Check-in** and **Check-out** dates.
2. Choose a floor and an available room.
3. Select nights on the date ribbon, optionally name the guest, then confirm.

### Your bookings

Sign in, then open **Bookings** in the header to view and cancel your reservations.

## Keyboard shortcuts

On conference/hostel views (when not typing in an input):

| Key | Action |
|-----|--------|
| ↑ / ↓ | Change selected floor |
| Esc | Deselect room |

## Tech stack

| Layer | Stack |
|-------|-------|
| Frontend | Angular 22 (standalone, signals, OnPush), Angular Material 22, Three.js 0.185 |
| Backend | Node.js 22+, Express 4, SQLite (`node:sqlite`) |
| Auth | bcryptjs + JWT (7-day TTL) |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | API + web together |
| `npm start` | Web only |
| `npm run server` | API only |
| `npm run build` | Production build → `dist/staybook` |

## Environment

Optional: set `STAYBOOK_JWT_SECRET` for production JWT signing (defaults to a dev secret).
