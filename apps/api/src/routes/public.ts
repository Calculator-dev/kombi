import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import {
  MAX_EXTRAS,
  addDays,
  bookingRequestSchema,
  diffDays,
  isIsoDate,
  optionId,
  quote,
  todayIn,
  type VanCard,
} from "@kombi/shared";
import type { Deps } from "../app";
import { HttpError } from "../errors";
import { busyVans, unavailableDates } from "../services/availability";
import { createBooking } from "../services/bookings";
import { getUser } from "../services/users";
import { getPublicVan, listPublicVans, pricingOf, toCard, toPublicVan } from "../services/vans";

const isoDate = z.string().refine(isIsoDate, "Neispravan datum");
const slug = z.string().regex(/^[a-z0-9-]{1,80}$/);

export function publicRoutes({ db, config, notifier, storage, now }: Deps): Router {
  const r = Router();
  const today = () => todayIn(config.BUSINESS_TZ, now());

  async function publicVan(s: string) {
    const van = await getPublicVan(db.orm, { slug: slug.parse(s) });
    if (!van) throw new HttpError(404, "not_found", "Kombi ne postoji.");
    return van;
  }

  r.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  /** All vans on offer. With ?start&end, also whether each is free then and the exact price. */
  r.get("/vans", async (req, res) => {
    const dates = z
      .object({ start: isoDate, end: isoDate })
      .refine((d) => d.end > d.start, { path: ["end"], message: "Povratak mora biti nakon preuzimanja" })
      .optional()
      .parse(req.query.start || req.query.end ? { start: req.query.start, end: req.query.end } : undefined);
    const vans = await listPublicVans(db.orm);
    let cards: VanCard[] = vans.map((v) => toCard(storage, v));
    if (dates) {
      const busy = await busyVans(db.orm, vans.map((v) => v.id), dates.start, dates.end);
      cards = vans.map((v, i) => {
        const q = quote(dates, pricingOf(v));
        return { ...cards[i]!, available: !busy.has(v.id), quote: { days: q.days, total: q.total, errors: q.errors } };
      });
      // Free vans first, then by price.
      cards.sort((a, b) => Number(b.available && !b.quote!.errors.length) - Number(a.available && !a.quote!.errors.length) || a.quote!.total - b.quote!.total);
    }
    res.set("Cache-Control", dates ? "no-store" : "public, max-age=60");
    res.json(cards);
  });

  r.get("/vans/:slug", async (req, res) => {
    res.set("Cache-Control", "public, max-age=60");
    res.json(toPublicVan(storage, await publicVan(req.params.slug)));
  });

  r.get("/vans/:slug/availability", async (req, res) => {
    const van = await publicVan(req.params.slug);
    const from = isoDate.optional().parse(req.query.from) ?? today();
    const to = isoDate.optional().parse(req.query.to) ?? addDays(from, 92);
    const span = diffDays(from, to);
    if (span < 0 || span > 400) throw new HttpError(400, "invalid_range", "Raspon može biti najviše 400 dana.");
    res.set("Cache-Control", "no-store");
    res.json({ from, to, today: today(), unavailable: await unavailableDates(db.orm, van.id, from, to) });
  });

  r.post("/quote", async (req, res) => {
    const input = z
      .object({
        vanId: z.uuid(),
        start: isoDate,
        end: isoDate,
        extras: z.array(optionId).max(MAX_EXTRAS).default([]),
        pickup: optionId.optional(),
      })
      .parse(req.body);
    const van = await getPublicVan(db.orm, { id: input.vanId });
    if (!van) throw new HttpError(404, "not_found", "Kombi ne postoji.");
    res.json(quote(input, pricingOf(van)));
  });

  const bookingLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: config.NODE_ENV === "test" ? 1000 : 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "too_many_requests", message: "Previše upita. Pokušajte kasnije ili nas kontaktirajte." },
  });

  r.post("/bookings", bookingLimiter, async (req, res) => {
    const { vanId } = z.object({ vanId: z.uuid() }).parse(req.body);
    const van = await getPublicVan(db.orm, { id: vanId });
    if (!van) throw new HttpError(404, "not_found", "Ovaj kombi više nije dostupan.");
    const body = bookingRequestSchema(pricingOf(van)).parse(req.body);
    if (body.website) {
      // Honeypot filled in: pretend success, store nothing.
      res.status(201).json({ ref: "KB-0000", status: "pending" });
      return;
    }
    const booking = await createBooking(db.orm, body, van, today());
    const owner = van.ownerId ? await getUser(db.orm, van.ownerId) : null;
    void notifier.bookingRequested(booking, owner?.email ?? null);
    res.status(201).json({
      ref: booking.ref,
      status: booking.status,
      start: booking.start,
      end: booking.end,
      total: booking.total,
      holdUntil: booking.holdUntil,
    });
  });

  return r;
}
