import { and, eq, gte, sql, type SQL } from "drizzle-orm";
import { addDays, eachDate, type AnalyticsReport } from "@kombi/shared";
import { schema, type Executor } from "../db";
import type { UserRow } from "../db/schema";

const { vans, vanStats, bookings } = schema;

export type VanEvent = "view" | "checkout";

/** Adds one to today's counter of a van. */
export async function recordVanEvent(db: Executor, vanId: string, day: string, event: VanEvent): Promise<void> {
  const views = event === "view" ? 1 : 0;
  const checkouts = event === "checkout" ? 1 : 0;
  await db
    .insert(vanStats)
    .values({ vanId, day, views, checkouts })
    .onConflictDoUpdate({
      target: [vanStats.vanId, vanStats.day],
      set: { views: sql`${vanStats.views} + ${views}`, checkouts: sql`${vanStats.checkouts} + ${checkouts}` },
    });
}

/**
 * Views, opened booking forms, requests and confirmed bookings of the user's
 * vans (every van for an admin) over the last `days` days, ending today.
 * Requests are counted on the day they were sent.
 */
export async function analyticsFor(
  db: Executor,
  user: UserRow,
  opts: { today: string; days: number; tz: string; vanId?: string },
): Promise<AnalyticsReport> {
  const from = addDays(opts.today, -(opts.days - 1));
  const owned: SQL | undefined = and(
    user.role === "admin" ? undefined : eq(vans.ownerId, user.id),
    opts.vanId ? eq(vans.id, opts.vanId) : undefined,
  );
  const sentOn = sql<string>`to_char(${bookings.createdAt} at time zone ${opts.tz}, 'YYYY-MM-DD')`;
  const [vanRows, statRows, bookingRows] = await Promise.all([
    db.select({ id: vans.id, name: vans.name }).from(vans).where(owned).orderBy(vans.createdAt),
    db
      .select({ vanId: vanStats.vanId, day: vanStats.day, views: vanStats.views, checkouts: vanStats.checkouts })
      .from(vanStats)
      .innerJoin(vans, eq(vans.id, vanStats.vanId))
      .where(and(owned, gte(vanStats.day, from))),
    db
      .select({ vanId: bookings.vanId, day: sentOn, status: bookings.status, total: bookings.total })
      .from(bookings)
      .innerJoin(vans, eq(vans.id, bookings.vanId))
      .where(and(owned, sql`${sentOn} >= ${from}`)),
  ]);

  const zero = () => ({ views: 0, checkouts: 0, requests: 0, confirmed: 0, revenue: 0 });
  const byDay = new Map(eachDate(from, opts.today).map((day) => [day, { day, views: 0, checkouts: 0, requests: 0 }]));
  const byVan = new Map(vanRows.map((v) => [v.id, { ...v, ...zero() }]));
  const totals = zero();
  for (const s of statRows) {
    for (const t of [byDay.get(s.day), byVan.get(s.vanId), totals]) {
      if (!t) continue;
      t.views += s.views;
      t.checkouts += s.checkouts;
    }
  }
  for (const b of bookingRows) {
    const day = byDay.get(b.day);
    if (day) day.requests += 1;
    for (const t of [byVan.get(b.vanId), totals]) {
      if (!t) continue;
      t.requests += 1;
      if (b.status === "confirmed") {
        t.confirmed += 1;
        t.revenue += b.total;
      }
    }
  }
  return { from, to: opts.today, days: [...byDay.values()], vans: [...byVan.values()], totals };
}
