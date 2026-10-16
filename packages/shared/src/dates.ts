/**
 * Dates are handled as ISO calendar dates ("YYYY-MM-DD") without time zones.
 * Internally they are converted to "day numbers" (days since 1970-01-01, UTC)
 * so arithmetic never trips over daylight-saving changes.
 */
const DAY_MS = 86_400_000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type IsoDate = string;

export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function toDayNum(date: IsoDate): number {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d) / DAY_MS;
}

export function fromDayNum(day: number): IsoDate {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromDayNum(toDayNum(date) + days);
}

/** Number of days between two dates (end - start). */
export function diffDays(start: IsoDate, end: IsoDate): number {
  return toDayNum(end) - toDayNum(start);
}

/** Every date from start to end, both inclusive. */
export function eachDate(start: IsoDate, end: IsoDate): IsoDate[] {
  const out: IsoDate[] = [];
  for (let d = toDayNum(start); d <= toDayNum(end); d++) out.push(fromDayNum(d));
  return out;
}

/** Today's date in the given IANA time zone (default: Sarajevo). */
export function todayIn(timeZone = "Europe/Sarajevo", now: Date = new Date()): IsoDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return parts; // en-CA formats as YYYY-MM-DD
}

/** "MM-DD" part of a date, used for yearly seasons. */
export function monthDay(date: IsoDate): string {
  return date.slice(5);
}
