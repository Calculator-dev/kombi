import { and, eq } from "drizzle-orm";
import type { ContractData } from "@kombi/shared";
import { schema, type Executor } from "../db";
import type { UserRow } from "../db/schema";
import { HttpError } from "../errors";
import { getBooking, type Booking } from "./bookings";
import { contractTermsOf, pricingOf, termsOf } from "./vans";
import { getUser } from "./users";

const { bookings, vans } = schema;

/**
 * The data that fills the rental contract for one booking: the van's owner as
 * lessor, the customer as renter, the van's papers and the agreed dates and price.
 * Whatever is missing comes back empty and is filled in by hand.
 */
export async function contractFor(db: Executor, user: UserRow, bookingId: string, today: string): Promise<ContractData> {
  const b = await getBooking(db, user, bookingId);
  if (!b) throw new HttpError(404, "not_found", "Rezervacija ne postoji.");
  return fill(db, b, today);
}

/**
 * The contract as the customer sees it, through the secret link in the
 * confirmation email. Only confirmed bookings: until then the owner may still
 * change the terms, and a declined request has no contract.
 */
export async function contractByToken(db: Executor, token: string, today: string): Promise<ContractData> {
  const [b] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.contractToken, token), eq(bookings.status, "confirmed")));
  if (!b) throw new HttpError(404, "not_found", "Ugovor ne postoji.");
  return fill(db, b, today);
}

async function fill(db: Executor, b: Omit<Booking, "vanName" | "holdExpired">, today: string): Promise<ContractData> {
  const [van] = await db.select().from(vans).where(eq(vans.id, b.vanId));
  if (!van) throw new HttpError(404, "not_found", "Kombi ne postoji.");
  const owner = van.ownerId ? await getUser(db, van.ownerId) : null;
  const terms = termsOf(van);
  return {
    ref: b.ref,
    date: today,
    lessor: {
      name: owner?.name ?? "",
      address: owner?.address ?? "",
      companyId: owner?.companyId ?? "",
      representative: owner?.representative ?? "",
      phone: owner?.phone ?? "",
      email: owner?.email ?? "",
    },
    renter: {
      name: b.name,
      jmb: b.jmb ?? "",
      idNumber: b.idNumber ?? "",
      licenseNumber: b.licenseNumber ?? "",
      address: b.address ?? "",
      phone: b.phone,
      email: b.email,
    },
    van: { name: van.name, year: van.year, location: van.location },
    start: b.start,
    end: b.end,
    pickupTime: b.pickupTime ?? "",
    returnTime: b.returnTime ?? "",
    days: b.quote.days,
    total: b.quote.onRequest ? null : b.total,
    deposit: b.quote.deposit ?? pricingOf(van).deposit,
    minDriverAge: terms.minDriverAge,
    minLicenseYears: terms.minLicenseYears,
    terms: contractTermsOf(van),
  };
}
