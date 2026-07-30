import { Floor, Room } from './models';

// Deterministic PRNG mirrored from the server seed (FNV-1a -> mulberry32).
// Kept in sync so the client could reconstruct the same layout offline.

function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rngFrom(str: string) {
  const next = mulberry32(hash(str));
  return {
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T>(arr: T[]): T => arr[Math.floor(next() * arr.length)],
    chance: (p: number) => next() < p,
  };
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const CAPACITIES = [2, 4, 6, 8, 10, 12];
const FLOORS = 10;

/** Reconstruct the deterministic floor/room layout for a building kind. */
export function buildFloors(kind: 'conference' | 'hostel'): Floor[] {
  const prefix = kind === 'conference' ? 'c' : 'h';
  const floors: Floor[] = [];
  for (let floor = 1; floor <= FLOORS; floor++) {
    const label = String(floor).padStart(2, '0');
    const rng = rngFrom(`${kind}:floor:${floor}`);
    const count = rng.int(6, 10);
    const rooms: Room[] = [];
    for (let idx = 0; idx < count; idx++) {
      const rr = rngFrom(`${kind}:room:${floor}:${idx}`);
      rooms.push({
        id: `${prefix}-r-${floor}-${idx}`,
        code: `${label}${LETTERS[idx]}`,
        floor,
        capacity: rr.pick(CAPACITIES),
        amenities: {
          naturalLight: rr.chance(0.6),
          videoConf: rr.chance(0.5),
          whiteboard: rr.chance(0.7),
        },
      });
    }
    floors.push({ number: floor, label, rooms });
  }
  return floors;
}
