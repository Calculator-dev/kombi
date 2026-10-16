import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { BOOKING_STATUSES, isIsoDate } from "@kombi/shared";
import type { Deps } from "../app";
import { SESSION_COOKIE } from "../auth";
import { HttpError } from "../errors";
import { createBlock, deleteBlock, listBlocks } from "../services/blocks";
import { listBookings, setBookingStatus } from "../services/bookings";
import { getSettings, saveSettings } from "../services/settings";

const isoDate = z.string().refine(isIsoDate, "Neispravan datum");
const uuid = z.uuid();

export function adminRoutes({ db, auth, notifier, config }: Deps): Router {
  const r = Router();

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.NODE_ENV === "test" ? 1000 : 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "too_many_requests", message: "Previše pokušaja. Pokušajte za 15 minuta." },
  });

  r.post("/login", loginLimiter, async (req, res) => {
    const { password } = z.object({ password: z.string().min(1).max(200) }).parse(req.body);
    if (!(await auth.checkPassword(password))) {
      throw new HttpError(401, "invalid_password", "Pogrešna lozinka.");
    }
    res.cookie(SESSION_COOKIE, await auth.issue(), auth.cookieOptions);
    res.json({ ok: true });
  });

  r.post("/logout", (_req, res) => {
    res.clearCookie(SESSION_COOKIE, { ...auth.cookieOptions, maxAge: undefined });
    res.json({ ok: true });
  });

  r.use(auth.requireAdmin);

  r.get("/me", (_req, res) => {
    res.json({ ok: true });
  });

  r.get("/bookings", async (req, res) => {
    const status = z.enum(BOOKING_STATUSES).optional().parse(req.query.status);
    const upcoming = req.query.upcoming === "1";
    res.json(await listBookings(db.orm, { status, upcoming }));
  });

  r.patch("/bookings/:id", async (req, res) => {
    const id = uuid.parse(req.params.id);
    const { status } = z.object({ status: z.enum(["confirmed", "declined", "cancelled"]) }).parse(req.body);
    const booking = await setBookingStatus(db.orm, id, status);
    if (status === "confirmed") void notifier.bookingConfirmed(booking);
    res.json(booking);
  });

  r.get("/blocks", async (_req, res) => {
    res.json(await listBlocks(db.orm));
  });

  r.post("/blocks", async (req, res) => {
    const body = z
      .object({ start: isoDate, end: isoDate, reason: z.string().trim().max(200).optional() })
      .refine((b) => b.end >= b.start, { path: ["end"], message: "Kraj mora biti nakon početka" })
      .parse(req.body);
    res.status(201).json(await createBlock(db.orm, { start: body.start, end: body.end, reason: body.reason ?? null }));
  });

  r.delete("/blocks/:id", async (req, res) => {
    if (!(await deleteBlock(db.orm, uuid.parse(req.params.id)))) throw new HttpError(404, "not_found", "Ne postoji.");
    res.status(204).end();
  });

  r.get("/settings", async (_req, res) => {
    res.json(await getSettings(db.orm));
  });

  r.put("/settings", async (req, res) => {
    res.json(await saveSettings(db.orm, req.body));
  });

  return r;
}
