import { and, asc, eq, gte, sql, type SQL } from "drizzle-orm";
import { quote, type BookingRequest, type BookingStatus, type Settings } from "@kombi/shared";
import { schema, type Database, type Executor } from "../db";
import type { BookingRow } from "../db/schema";
import { HttpError } from "../errors";
import { hasConflict, lockCalendar } from "./availability";

const { bookings } = schema;

export type Booking = BookingRow & { holdExpired: boolean };

function withHold(row: BookingRow): Booking {
  return {
    ...row,
    holdExpired: row.status === "pending" && row.holdUntil !== null && row.holdUntil.getTime() <= Date.now(),
  };
}

export async function createBooking(
  db: Database,
  req: BookingRequest,
  settings: Settings,
  today: string,
): Promise<Booking> {
  if (req.start < today) throw new HttpError(400, "date_in_past", "Datum preuzimanja je u prošlosti.");
  const q = quote(req, settings);
  if (q.errors.length) throw new HttpError(400, "invalid_dates", q.errors.join(" "));

  return db.transaction(async (tx) => {
    await lockCalendar(tx);
    if (await hasConflict(tx, req.start, req.end)) {
      throw new HttpError(409, "dates_taken", "Neko je upravo zauzeo ove datume. Odaberite druge.");
    }
    // Both drivers (node-postgres and PGlite) return { rows }.
    const seq = (await tx.execute(sql`select nextval('booking_ref_seq')::text as n`)) as unknown as { rows: { n: string }[] };
    const ref = `KB-${today.slice(0, 4)}-${seq.rows[0]!.n.padStart(4, "0")}`;
    const [row] = await tx
      .insert(bookings)
      .values({
        ref,
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
        pickupAddress: req.pickup === "office" ? null : (req.pickupAddress ?? null),
        pickupTime: req.pickupTime ?? null,
        returnTime: req.returnTime ?? null,
        quote: q,
        total: q.total,
        holdUntil: sql`now() + make_interval(hours => ${settings.pendingHoldHours}::int)`,
      })
      .returning();
    return withHold(row!);
  });
}

export async function listBookings(
  db: Executor,
  opts: { status?: BookingStatus; upcoming?: boolean } = {},
): Promise<Booking[]> {
  const where: (SQL | undefined)[] = [
    opts.status ? eq(bookings.status, opts.status) : undefined,
    opts.upcoming ? gte(bookings.end, sql`current_date`) : undefined,
  ];
  const rows = await db
    .select()
    .from(bookings)
    .where(and(...where))
    .orderBy(sql`case ${bookings.status} when 'pending' then 0 else 1 end`, asc(bookings.start))
    .limit(500);
  return rows.map(withHold);
}

export async function getBooking(db: Executor, id: string): Promise<Booking | null> {
  const [row] = await db.select().from(bookings).where(eq(bookings.id, id));
  return row ? withHold(row) : null;
}

export async function setBookingStatus(db: Database, id: string, status: BookingStatus): Promise<Booking> {
  return db.transaction(async (tx) => {
    await lockCalendar(tx);
    const current = await getBooking(tx, id);
    if (!current) throw new HttpError(404, "not_found", "Rezervacija ne postoji.");
    if (status === "pending" && current.status !== "pending") {
      throw new HttpError(400, "invalid_status", "Rezervacija se ne može vratiti na čekanje.");
    }
    if (status === "confirmed" && current.status !== "confirmed") {
      if (await hasConflict(tx, current.start, current.end, id)) {
        throw new HttpError(409, "dates_taken", "Ovi datumi su u međuvremenu zauzeti ili blokirani.");
      }
    }
    const [row] = await tx
      .update(bookings)
      .set({ status, updatedAt: sql`now()`, holdUntil: status === "pending" ? current.holdUntil : null })
      .where(eq(bookings.id, id))
      .returning();
    return withHold(row!);
  });
}
