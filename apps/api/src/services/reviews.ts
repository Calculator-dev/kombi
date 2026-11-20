import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { ReviewInput, ReviewSummary } from "@kombi/shared";
import { bookings, reviews, vans, type BookingRow, type ReviewRow, type UserRow } from "../db/schema";
import type { Executor } from "../db";
import { HttpError } from "../errors";

/** Only the first name goes on the site: "Amra Hodžić" → "Amra". */
export const firstName = (full: string) => full.trim().split(/\s+/)[0] ?? "";

/**
 * A rental can be rated once it really happened: the booking was confirmed and
 * its return day has passed.
 */
export const canBeReviewed = (b: Pick<BookingRow, "status" | "end">, today: string) => b.status === "confirmed" && b.end <= today;

/** What the review page shows for a link, and whether the form is open. */
export interface ReviewContext {
  vanName: string;
  vanSlug: string;
  start: string;
  end: string;
  name: string;
  /** "open": can be rated now; "done": already rated; "early": the rental isn't over yet; "closed": not a confirmed rental. */
  state: "open" | "done" | "early" | "closed";
  review?: { rating: number; comment: string };
}

async function bookingByToken(db: Executor, token: string) {
  const [row] = await db
    .select({ booking: bookings, vanName: vans.name, vanSlug: vans.slug, review: reviews })
    .from(bookings)
    .innerJoin(vans, eq(vans.id, bookings.vanId))
    .leftJoin(reviews, eq(reviews.bookingId, bookings.id))
    .where(eq(bookings.reviewToken, token));
  if (!row) throw new HttpError(404, "not_found", "Link za ocjenu ne postoji.");
  return row;
}

export async function reviewContext(db: Executor, token: string, today: string): Promise<ReviewContext> {
  const { booking: b, vanName, vanSlug, review } = await bookingByToken(db, token);
  const state = review ? "done" : b.status !== "confirmed" ? "closed" : canBeReviewed(b, today) ? "open" : "early";
  return {
    vanName,
    vanSlug,
    start: b.start,
    end: b.end,
    name: firstName(b.name),
    state,
    review: review ? { rating: review.rating, comment: review.comment } : undefined,
  };
}

export async function submitReview(db: Executor, token: string, input: ReviewInput, today: string): Promise<ReviewRow> {
  const { booking: b, review } = await bookingByToken(db, token);
  if (review) throw new HttpError(409, "already_reviewed", "Ovaj najam je već ocijenjen. Hvala!");
  if (!canBeReviewed(b, today)) throw new HttpError(409, "not_reviewable", "Najam možete ocijeniti kada se završi.");
  const [row] = await db
    .insert(reviews)
    .values({ bookingId: b.id, vanId: b.vanId, rating: input.rating, comment: input.comment, name: firstName(b.name) })
    .onConflictDoNothing({ target: reviews.bookingId })
    .returning();
  if (!row) throw new HttpError(409, "already_reviewed", "Ovaj najam je već ocijenjen. Hvala!");
  return row;
}

/** A van's visible reviews: average, count and the newest ones. */
export async function reviewSummary(db: Executor, vanId: string): Promise<ReviewSummary> {
  const rows = await db
    .select()
    .from(reviews)
    .where(and(eq(reviews.vanId, vanId), eq(reviews.hidden, false)))
    .orderBy(desc(reviews.createdAt));
  const count = rows.length;
  const average = count ? Math.round((rows.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0;
  return {
    count,
    average,
    items: rows.slice(0, 20).map((r) => ({ rating: r.rating, comment: r.comment, name: r.name, date: r.createdAt.toISOString().slice(0, 10) })),
  };
}

/** Average and count per van, for the cards in lists; vans without reviews are left out. */
export async function ratingsOf(db: Executor, vanIds: string[]): Promise<Map<string, { average: number; count: number }>> {
  if (!vanIds.length) return new Map();
  const rows = await db
    .select({ vanId: reviews.vanId, average: sql<number>`round(avg(${reviews.rating})::numeric, 1)::float`, count: sql<number>`count(*)::int` })
    .from(reviews)
    .where(and(inArray(reviews.vanId, vanIds), eq(reviews.hidden, false)))
    .groupBy(reviews.vanId);
  return new Map(rows.map((r) => [r.vanId, { average: Number(r.average), count: Number(r.count) }]));
}

/** Notes that the customer was asked for a review. */
export async function markReviewRequested(db: Executor, bookingId: string): Promise<void> {
  await db.update(bookings).set({ reviewRequestedAt: sql`now()` }).where(eq(bookings.id, bookingId));
}

/** Every review, newest first, for the platform admin to read and hide. */
export async function listReviews(db: Executor) {
  return db
    .select({ review: reviews, vanName: vans.name, vanSlug: vans.slug })
    .from(reviews)
    .innerJoin(vans, eq(vans.id, reviews.vanId))
    .orderBy(desc(reviews.createdAt));
}

export async function setReviewHidden(db: Executor, user: UserRow, id: string, hidden: boolean): Promise<ReviewRow> {
  if (user.role !== "admin") throw new HttpError(403, "forbidden", "Samo administrator može sakriti ocjenu.");
  const [row] = await db.update(reviews).set({ hidden }).where(eq(reviews.id, id)).returning();
  if (!row) throw new HttpError(404, "not_found", "Ocjena ne postoji.");
  return row;
}
