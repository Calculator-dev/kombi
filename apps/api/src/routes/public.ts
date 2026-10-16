import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import {
  bookingRequestSchema,
  diffDays,
  isIsoDate,
  quote,
  MAX_EXTRAS,
  optionId,
  todayIn,
  addDays,
} from "@kombi/shared";
import type { Deps } from "../app";
import { HttpError } from "../errors";
import { unavailableDates } from "../services/availability";
import { createBooking } from "../services/bookings";
import { getSettings } from "../services/settings";

const isoDate = z.string().refine(isIsoDate, "Neispravan datum");

export function publicRoutes({ db, config, notifier, now }: Deps): Router {
  const r = Router();
  const today = () => todayIn(config.BUSINESS_TZ, now());

  r.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  r.get("/settings", async (_req, res) => {
    res.set("Cache-Control", "public, max-age=60");
    res.json(await getSettings(db.orm));
  });

  r.get("/availability", async (req, res) => {
    const from = isoDate.optional().parse(req.query.from) ?? today();
    const to = isoDate.optional().parse(req.query.to) ?? addDays(from, 92);
    const span = diffDays(from, to);
    if (span < 0 || span > 400) throw new HttpError(400, "invalid_range", "Raspon može biti najviše 400 dana.");
    res.set("Cache-Control", "no-store");
    res.json({ from, to, today: today(), unavailable: await unavailableDates(db.orm, from, to) });
  });

  r.post("/quote", async (req, res) => {
    const input = z
      .object({
        start: isoDate,
        end: isoDate,
        extras: z.array(optionId).max(MAX_EXTRAS).default([]),
        pickup: optionId.optional(),
      })
      .parse(req.body);
    res.json(quote(input, await getSettings(db.orm)));
  });

  const bookingLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: config.NODE_ENV === "test" ? 1000 : 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "too_many_requests", message: "Previše upita. Pokušajte kasnije ili nas kontaktirajte." },
  });

  r.post("/bookings", bookingLimiter, async (req, res) => {
    const settings = await getSettings(db.orm);
    const body = bookingRequestSchema(settings).parse(req.body);
    if (body.website) {
      // Honeypot filled in: pretend success, store nothing.
      res.status(201).json({ ref: "KB-0000", status: "pending" });
      return;
    }
    const booking = await createBooking(db.orm, body, settings, today());
    void notifier.bookingRequested(booking);
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
