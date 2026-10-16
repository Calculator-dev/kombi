import { and, count, eq, gt, gte, lte, ne, or, sql, type SQL } from "drizzle-orm";
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

export async function unavailableDates(db: Executor, from: IsoDate, to: IsoDate): Promise<IsoDate[]> {
  const [booked, blocked] = await Promise.all([
    db.select({ start: bookings.start, end: bookings.end }).from(bookings).where(and(activeBooking, overlaps(bookings, from, to))),
    db
      .select({ start: blockedRanges.start, end: blockedRanges.end })
      .from(blockedRanges)
      .where(overlaps(blockedRanges, from, to)),
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
  start: IsoDate,
  end: IsoDate,
  excludeBookingId?: string,
): Promise<boolean> {
  const [b] = await db
    .select({ n: count() })
    .from(bookings)
    .where(and(activeBooking, overlaps(bookings, start, end), excludeBookingId ? ne(bookings.id, excludeBookingId) : undefined));
  const [bl] = await db.select({ n: count() }).from(blockedRanges).where(overlaps(blockedRanges, start, end));
  return (b?.n ?? 0) + (bl?.n ?? 0) > 0;
}

/** Serialises booking writes so two requests can never take the same dates. */
export async function lockCalendar(tx: Executor): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(7426)`);
}
