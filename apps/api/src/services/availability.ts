import { and, count, eq, gt, gte, inArray, lte, ne, or, sql, type SQL } from "drizzle-orm";
import { eachDate, toDayNum, type IsoDate } from "@kombi/shared";
import { schema, type Executor } from "../db";

const { bookings, blockedRanges } = schema;

/**
 * A booking occupies the van from the pickup date through the return date
 * (both inclusive), leaving the return day for cleaning and handover.
 * Pending requests hold their dates until `hold_until`, so two people can't
 * request the same days while the owner is deciding.
 */
const activeBooking = or(
  eq(bookings.status, "confirmed"),
  and(eq(bookings.status, "pending"), gt(bookings.holdUntil, sql`now()`)),
);

function overlaps(t: typeof bookings | typeof blockedRanges, start: IsoDate, end: IsoDate): SQL {
  return and(lte(t.start, end), gte(t.end, start))!;
}

export async function unavailableDates(db: Executor, vanId: string, from: IsoDate, to: IsoDate): Promise<IsoDate[]> {
  const [booked, blocked] = await Promise.all([
    db
      .select({ start: bookings.start, end: bookings.end })
      .from(bookings)
      .where(and(eq(bookings.vanId, vanId), activeBooking, overlaps(bookings, from, to))),
    db
      .select({ start: blockedRanges.start, end: blockedRanges.end })
      .from(blockedRanges)
      .where(and(eq(blockedRanges.vanId, vanId), overlaps(blockedRanges, from, to))),
  ]);
  const lo = toDayNum(from);
  const hi = toDayNum(to);
  const out = new Set<IsoDate>();
  for (const r of [...booked, ...blocked]) {
    for (const d of eachDate(r.start, r.end)) {
      const n = toDayNum(d);
      if (n >= lo && n <= hi) out.add(d);
    }
  }
  return [...out].sort();
}

export async function hasConflict(
  db: Executor,
  vanId: string,
  start: IsoDate,
  end: IsoDate,
  excludeBookingId?: string,
): Promise<boolean> {
  const [b] = await db
    .select({ n: count() })
    .from(bookings)
    .where(
      and(
        eq(bookings.vanId, vanId),
        activeBooking,
        overlaps(bookings, start, end),
        excludeBookingId ? ne(bookings.id, excludeBookingId) : undefined,
      ),
    );
  const [bl] = await db
    .select({ n: count() })
    .from(blockedRanges)
    .where(and(eq(blockedRanges.vanId, vanId), overlaps(blockedRanges, start, end)));
  return (b?.n ?? 0) + (bl?.n ?? 0) > 0;
}

/** Of these vans, the ones that are taken on any day from start to end. */
export async function busyVans(db: Executor, vanIds: string[], start: IsoDate, end: IsoDate): Promise<Set<string>> {
  if (!vanIds.length) return new Set();
  const [booked, blocked] = await Promise.all([
    db
      .selectDistinct({ id: bookings.vanId })
      .from(bookings)
      .where(and(inArray(bookings.vanId, vanIds), activeBooking, overlaps(bookings, start, end))),
    db
      .selectDistinct({ id: blockedRanges.vanId })
      .from(blockedRanges)
      .where(and(inArray(blockedRanges.vanId, vanIds), overlaps(blockedRanges, start, end))),
  ]);
  return new Set([...booked, ...blocked].map((r) => r.id));
}

/**
 * Serialises booking writes for one van, so two requests can never take the
 * same dates. Different vans don't wait for each other.
 */
export async function lockVanCalendar(tx: Executor, vanId: string): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(7426, hashtext(${vanId}))`);
}
