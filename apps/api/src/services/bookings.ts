import { and, asc, eq, gte, inArray, sql, type SQL } from "drizzle-orm";
import { findPickup, quote, type BookingRequest, type BookingStatus } from "@kombi/shared";
import { schema, type Database, type Executor } from "../db";
import type { BookingRow, UserRow, VanRow } from "../db/schema";
import { HttpError } from "../errors";
import { hasConflict, lockVanCalendar } from "./availability";
import { pricingOf } from "./vans";

const { bookings, vans } = schema;

export type Booking = BookingRow & { holdExpired: boolean; vanName: string };

function withHold(row: BookingRow, vanName: string): Booking {
  return {
    ...row,
    vanName,
    holdExpired: row.status === "pending" && row.holdUntil !== null && row.holdUntil.getTime() <= Date.now(),
  };
}

export async function createBooking(db: Database, req: BookingRequest, van: VanRow, today: string): Promise<Booking> {
  if (req.start < today) throw new HttpError(400, "date_in_past", "Datum preuzimanja je u prošlosti.");
  const pricing = pricingOf(van);
  const q = quote(req, pricing);
  if (q.errors.length) throw new HttpError(400, "invalid_dates", q.errors.join(" "));

  return db.transaction(async (tx) => {
    await lockVanCalendar(tx, van.id);
    if (await hasConflict(tx, van.id, req.start, req.end)) {
      throw new HttpError(409, "dates_taken", "Neko je upravo zauzeo ove datume. Odaberite druge.");
    }
    // Both drivers (node-postgres and PGlite) return { rows }.
    const seq = (await tx.execute(sql`select nextval('booking_ref_seq')::text as n`)) as unknown as { rows: { n: string }[] };
    const ref = `KB-${today.slice(0, 4)}-${seq.rows[0]!.n.padStart(4, "0")}`;
    const [row] = await tx
      .insert(bookings)
      .values({
        ref,
        vanId: van.id,
        status: "pending",
        start: req.start,
        end: req.end,
        name: req.name,
        email: req.email,
        phone: req.phone,
        contactChannel: req.contactChannel,
        birthDate: req.birthDate ?? null,
        licenseSince: req.licenseSince ?? null,
        notes: req.notes ?? null,
        extras: req.extras,
        pickup: req.pickup,
        pickupAddress: findPickup(pricing, req.pickup)?.detailsLabel ? (req.pickupAddress ?? null) : null,
        pickupTime: req.pickupTime ?? null,
        returnTime: req.returnTime ?? null,
        quote: q,
        total: q.total,
        holdUntil: sql`now() + make_interval(hours => ${pricing.pendingHoldHours}::int)`,
      })
      .returning();
    return withHold(row!, van.name);
  });
}

/** Only bookings of vans this user manages (every van for an admin). */
function ownedBy(user: UserRow): SQL | undefined {
  return user.role === "admin" ? undefined : eq(vans.ownerId, user.id);
}

export async function listBookings(
  db: Executor,
  user: UserRow,
  opts: { status?: BookingStatus; upcoming?: boolean; vanId?: string } = {},
): Promise<Booking[]> {
  const rows = await db
    .select({ b: bookings, vanName: vans.name })
    .from(bookings)
    .innerJoin(vans, eq(vans.id, bookings.vanId))
    .where(
      and(
        ownedBy(user),
        opts.vanId ? eq(bookings.vanId, opts.vanId) : undefined,
        opts.status ? eq(bookings.status, opts.status) : undefined,
        opts.upcoming ? gte(bookings.end, sql`current_date`) : undefined,
      ),
    )
    .orderBy(sql`case ${bookings.status} when 'pending' then 0 else 1 end`, asc(bookings.start))
    .limit(500);
  return rows.map((r) => withHold(r.b, r.vanName));
}

/** The booking, if the user manages its van; otherwise "not found". */
export async function getBooking(db: Executor, user: UserRow, id: string): Promise<Booking | null> {
  const [row] = await db
    .select({ b: bookings, vanName: vans.name })
    .from(bookings)
    .innerJoin(vans, eq(vans.id, bookings.vanId))
    .where(and(eq(bookings.id, id), ownedBy(user)));
  return row ? withHold(row.b, row.vanName) : null;
}

export async function setBookingStatus(db: Database, user: UserRow, id: string, status: BookingStatus): Promise<Booking> {
  const found = await getBooking(db, user, id);
  if (!found) throw new HttpError(404, "not_found", "Rezervacija ne postoji.");
  return db.transaction(async (tx) => {
    await lockVanCalendar(tx, found.vanId);
    const current = (await getBooking(tx, user, id))!;
    if (status === "pending" && current.status !== "pending") {
      throw new HttpError(400, "invalid_status", "Rezervacija se ne može vratiti na čekanje.");
    }
    if (status === "confirmed" && current.status !== "confirmed") {
      if (await hasConflict(tx, current.vanId, current.start, current.end, id)) {
        throw new HttpError(409, "dates_taken", "Ovi datumi su u međuvremenu zauzeti ili blokirani.");
      }
    }
    const [row] = await tx
      .update(bookings)
      .set({ status, updatedAt: sql`now()`, holdUntil: status === "pending" ? current.holdUntil : null })
      .where(eq(bookings.id, id))
      .returning();
    return withHold(row!, current.vanName);
  });
}

export async function vanIdsWithBookings(db: Executor, vanIds: string[]): Promise<Set<string>> {
  if (!vanIds.length) return new Set();
  const rows = await db.selectDistinct({ id: bookings.vanId }).from(bookings).where(inArray(bookings.vanId, vanIds));
  return new Set(rows.map((r) => r.id));
}
