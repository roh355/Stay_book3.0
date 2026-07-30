function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Local-date -> yyyy-mm-dd (no timezone shift). */
export function toYmd(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** yyyy-mm-dd -> local Date at midnight. */
export function fromYmd(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(ymd: string, days: number): string {
  const d = fromYmd(ymd);
  d.setDate(d.getDate() + days);
  return toYmd(d);
}

export function today(): string {
  return toYmd(new Date());
}

/** Whole nights between two yyyy-mm-dd (checkOut exclusive — API/storage format). */
export function nightsBetween(checkIn: string, checkOut: string): number {
  const ms = fromYmd(checkOut).getTime() - fromYmd(checkIn).getTime();
  return Math.round(ms / 86_400_000);
}

/** Nights when both check-in and check-out dates are inclusive (UI format). */
export function nightsInclusive(checkIn: string, checkOutInclusive: string): number {
  const ms =
    fromYmd(checkOutInclusive).getTime() - fromYmd(checkIn).getTime();
  return Math.round(ms / 86_400_000) + 1;
}

/** Convert inclusive check-out (UI) to exclusive (API). */
export function toExclusiveCheckOut(checkOutInclusive: string): string {
  return addDays(checkOutInclusive, 1);
}

/** Convert exclusive check-out (API) to inclusive (UI). */
export function toInclusiveCheckOut(checkOutExclusive: string): string {
  return addDays(checkOutExclusive, -1);
}

/** dd/mm/yyyy display. */
export function formatDmy(ymd: string): string {
  const d = fromYmd(ymd);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

/** dd/mm/yy display (2-digit year). */
export function formatDmyShort(ymd: string): string {
  const d = fromYmd(ymd);
  const yy = String(d.getFullYear() % 100).padStart(2, '0');
  return `${d.getDate()}/${d.getMonth() + 1}/${yy}`;
}

/** "Mon" short weekday. */
export function weekdayShort(ymd: string): string {
  return fromYmd(ymd).toLocaleDateString(undefined, { weekday: 'short' });
}

/** Day of month, e.g. "4". */
export function dayNum(ymd: string): string {
  return String(fromYmd(ymd).getDate());
}

/** "Jul" short month. */
export function monthShort(ymd: string): string {
  return fromYmd(ymd).toLocaleDateString(undefined, { month: 'short' });
}

/** "Thu, Jul 2" long-ish label. */
export function longDate(ymd: string): string {
  return fromYmd(ymd).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** "2/7/2026 → 4/7/2026 · 3 nights" — both dates inclusive (UI). */
export function stayRangeLabel(checkIn: string, checkOutInclusive: string): string {
  const n = nightsInclusive(checkIn, checkOutInclusive);
  return `${formatDmy(checkIn)} → ${formatDmy(checkOutInclusive)} · ${n} night${n === 1 ? '' : 's'}`;
}

/** Label for a stored stay row (checkOut is exclusive in the DB). */
export function stayRangeLabelFromStay(checkIn: string, checkOutExclusive: string): string {
  return stayRangeLabel(checkIn, toInclusiveCheckOut(checkOutExclusive));
}

export function isFirstOfMonth(ymd: string): boolean {
  return fromYmd(ymd).getDate() === 1;
}
