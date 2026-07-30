import { WORKING_DAY, SLOT_COUNT } from './models';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Slot index (0..SLOT_COUNT) -> "HH:MM" boundary label. */
export function slotToLabel(slot: number): string {
  const minutes = WORKING_DAY.startMinutes + slot * WORKING_DAY.slotMinutes;
  return `${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`;
}

/** "09:00 – 10:30" style label for a [start, end) range. */
export function rangeLabel(startSlot: number, endSlot: number): string {
  return `${slotToLabel(startSlot)} – ${slotToLabel(endSlot)}`;
}

/** "1h 30m" style duration for a slot span. */
export function durationLabel(startSlot: number, endSlot: number): string {
  const mins = (endSlot - startSlot) * WORKING_DAY.slotMinutes;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

/** Whole-hour tick slots for the ribbon (every 2 half-hour slots). */
export function hourTicks(): number[] {
  const ticks: number[] = [];
  for (let s = 0; s <= SLOT_COUNT; s += 2) ticks.push(s);
  return ticks;
}

/** Overlap test shared by both booking modes. */
export function overlaps(
  start: number,
  end: number,
  existingStart: number,
  existingEnd: number,
): boolean {
  return start < existingEnd && end > existingStart;
}
