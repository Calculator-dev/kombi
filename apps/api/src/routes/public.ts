import { Router } from "express";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import {
  DOCUMENT_KINDS,
  HANDOVER_SIDES,
  MAX_DOCUMENT_BYTES,
  MAX_FILES_PER_DOCUMENT,
  MAX_EXTRAS,
  askedDocuments,
  addDays,
  bookingRequestSchema,
  diffDays,
  isIsoDate,
  optionId,
  quote,
  reviewSchema,
  todayIn,
  vanSearchSchema,
  type VanCard,
} from "@kombi/shared";
import { and, eq } from "drizzle-orm";
import type { Deps } from "../app";
import { schema } from "../db";
import { HttpError } from "../errors";
import { busyVans, unavailableDates } from "../services/availability";
import { createBooking } from "../services/bookings";
import { contractByToken } from "../services/contract";
import { checkUploads, documentRulesFor, documentsKey, prepareUploads, saveDocuments, type Upload } from "../services/documents";
import { ratingsOf, reviewContext, reviewSummary, submitReview } from "../services/reviews";
import { recordVanEvent } from "../services/stats";
import { getUser } from "../services/users";
import { companyPage, ensureSlug } from "../services/company";
import { servicesOf } from "../services/services";
import { handoverOf, removeHandoverVideo, renterRecording, setHandoverVideo } from "../services/videos";
import { getPublicVan, listPublicVans, logoUrl, ownerLogos, ownerOf, pricingOf, publicLimits, searchVans, toCard, toPublicVan } from "../services/vans";

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
    const [ratings, logos] = await Promise.all([ratingsOf(db.orm, vans.map((v) => v.id)), ownerLogos(db.orm, storage, vans)]);
    let cards: VanCard[] = vans.map((v) => ({ ...toCard(storage, v), rating: ratings.get(v.id), ownerLogo: logos.get(v.id) ?? null }));
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

  /** The /kombiji search: filters, sorting and pages (see vanSearchSchema). */
  r.get("/search", async (req, res) => {
    const q = vanSearchSchema.parse(req.query);
    res.set("Cache-Control", q.start ? "no-store" : "public, max-age=60");
    res.json(await searchVans(db.orm, storage, q));
  });

  r.get("/vans/:slug", async (req, res) => {
    res.set("Cache-Control", "public, max-age=60");
    const van = await publicVan(req.params.slug);
    const [owner, reviews, documents, services] = await Promise.all([
      ownerOf(db.orm, van),
      reviewSummary(db.orm, van.id),
      documentRulesFor(db.orm, van.ownerId),
      servicesOf(db.orm, van.id),
    ]);
    res.json({
      ...toPublicVan(storage, van),
      owner: owner?.name ?? null,
      ownerSlug: owner ? await ensureSlug(db.orm, owner) : null,
      ownerLogo: logoUrl(storage, owner?.logo),
      services,
      vat: owner ? owner.vat : null,
      limits: publicLimits(van),
      reviews,
      documents: askedDocuments(documents).length ? documents : undefined,
    });
  });

  /** An owner's public page: logo, makes and vehicles. */
  r.get("/companies/:slug", async (req, res) => {
    const page = await companyPage(db.orm, storage, slug.parse(req.params.slug));
    if (!page) throw new HttpError(404, "not_found", "Firma ne postoji.");
    res.set("Cache-Control", "public, max-age=60");
    res.json(page);
  });

  r.get("/vans/:slug/availability", async (req, res) => {
    const van = await publicVan(String(req.params.slug));
    const from = isoDate.optional().parse(req.query.from) ?? today();
    const to = isoDate.optional().parse(req.query.to) ?? addDays(from, 92);
    const span = diffDays(from, to);
    if (span < 0 || span > 400) throw new HttpError(400, "invalid_range", "Raspon može biti najviše 400 dana.");
    res.set("Cache-Control", "no-store");
    res.json({ from, to, today: today(), unavailable: await unavailableDates(db.orm, van.id, from, to) });
  });

  const hitLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: config.NODE_ENV === "test" ? 10_000 : 300,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  });

  /** Counts a visit to a van's page, or an opened booking form, for its owner's analytics. Nothing about the visitor is kept. */
  r.post("/vans/:slug/hit", hitLimiter, async (req, res) => {
    const { type } = z.object({ type: z.enum(["view", "checkout"]) }).parse(req.body);
    const van = await publicVan(String(req.params.slug));
    await recordVanEvent(db.orm, van.id, today(), type);
    res.status(204).end();
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

  const contractLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: config.NODE_ENV === "test" ? 10_000 : 60,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  });

  /** The customer's copy of the rental contract, behind the secret link from the confirmation email. */
  r.get("/contracts/:token", contractLimiter, async (req, res) => {
    const token = z.string().regex(/^[0-9a-f]{64}$/).safeParse(req.params.token);
    if (!token.success) throw new HttpError(404, "not_found", "Ugovor ne postoji.");
    res.set("Cache-Control", "private, no-store");
    res.json(await contractByToken(db.orm, storage, token.data, today()));
  });

  /** The customer films each side of the vehicle when returning it, from their contract link. The body is the video. */
  const confirmedByToken = async (t: unknown) => {
    const token = z.string().regex(/^[0-9a-f]{64}$/).safeParse(t);
    const [b] = token.success
      ? await db.orm
          .select({ b: schema.bookings, vanName: schema.vans.name, ownerId: schema.vans.ownerId })
          .from(schema.bookings)
          .innerJoin(schema.vans, eq(schema.vans.id, schema.bookings.vanId))
          .where(and(eq(schema.bookings.contractToken, token.data), eq(schema.bookings.status, "confirmed")))
      : [];
    if (!b) throw new HttpError(404, "not_found", "Ugovor ne postoji.");
    return b;
  };
  const renterVideos = async (bookingId: string) =>
    ((await handoverOf(db.orm, storage, [bookingId])).get(bookingId) ?? []).filter((v) => v.by === "renter");

  r.put("/contracts/:token/handover/:side", contractLimiter, async (req, res) => {
    const { b, vanName, ownerId } = await confirmedByToken(req.params.token);
    const side = z.enum(HANDOVER_SIDES).parse(req.params.side);
    const window = renterRecording(b, today());
    if (!window.open) {
      throw new HttpError(409, "not_now", today() < window.from ? "Vozilo snimate kad ga vraćate, od dana preuzimanja." : "Rok za snimanje vozila je prošao.");
    }
    const before = (await renterVideos(b.id)).length;
    await setHandoverVideo(db.orm, storage, b.id, "return", side, req, "renter");
    const after = await renterVideos(b.id);
    if (before < HANDOVER_SIDES.length && after.length === HANDOVER_SIDES.length) {
      const owner = ownerId ? await getUser(db.orm, ownerId) : null;
      void notifier.renterFilmedReturn({ ...b, vanName }, owner?.email ?? null);
    }
    res.json(after);
  });

  r.delete("/contracts/:token/handover/:side", contractLimiter, async (req, res) => {
    const { b } = await confirmedByToken(req.params.token);
    if (!renterRecording(b, today()).open) throw new HttpError(409, "not_now", "Rok za snimanje vozila je prošao.");
    await removeHandoverVideo(db.orm, storage, b.id, "return", z.enum(HANDOVER_SIDES).parse(req.params.side), "renter");
    res.json(await renterVideos(b.id));
  });

  const reviewToken = (t: unknown) => {
    const token = z.string().regex(/^[0-9a-f]{64}$/).safeParse(t);
    if (!token.success) throw new HttpError(404, "not_found", "Link za ocjenu ne postoji.");
    return token.data;
  };

  /** The page behind the review link the customer gets after the rental. */
  r.get("/reviews/:token", contractLimiter, async (req, res) => {
    res.set("Cache-Control", "private, no-store");
    res.json(await reviewContext(db.orm, reviewToken(req.params.token), today()));
  });

  r.post("/reviews/:token", contractLimiter, async (req, res) => {
    const token = reviewToken(req.params.token);
    await submitReview(db.orm, token, reviewSchema.parse(req.body), today());
    res.status(201).json(await reviewContext(db.orm, token, today()));
  });

  // With documents the request is multipart: the form as JSON in "data", the photos as "id" and "license".
  const documentUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_DOCUMENT_BYTES, files: DOCUMENT_KINDS.length * MAX_FILES_PER_DOCUMENT, fields: 1, fieldSize: 50_000 },
  }).fields(DOCUMENT_KINDS.map((name) => ({ name, maxCount: MAX_FILES_PER_DOCUMENT })));

  r.post("/bookings", bookingLimiter, documentUpload, async (req, res) => {
    if (typeof req.body?.data === "string") {
      try {
        req.body = JSON.parse(req.body.data);
      } catch {
        throw new HttpError(400, "invalid_request", "Neispravan upit.");
      }
    }
    const files = (req.files ?? {}) as Partial<Record<(typeof DOCUMENT_KINDS)[number], Express.Multer.File[]>>;
    const uploads: Upload[] = DOCUMENT_KINDS.flatMap((kind) => (files[kind] ?? []).map((f) => ({ kind, buffer: f.buffer })));
    const { vanId } = z.object({ vanId: z.uuid() }).parse(req.body);
    const van = await getPublicVan(db.orm, { id: vanId });
    if (!van) throw new HttpError(404, "not_found", "Ovaj kombi više nije dostupan.");
    const body = bookingRequestSchema(pricingOf(van)).parse(req.body);
    if (body.website) {
      // Honeypot filled in: pretend success, store nothing.
      res.status(201).json({ ref: "KB-0000", status: "pending" });
      return;
    }
    checkUploads(await documentRulesFor(db.orm, van.ownerId), uploads);
    const photos = await prepareUploads(uploads);
    const booking = await createBooking(db.orm, body, van, today());
    if (photos.length) {
      try {
        await saveDocuments(db.orm, storage, documentsKey(config), booking.id, photos);
      } catch (e) {
        // Without its documents the request is incomplete: take it back.
        await db.orm.delete(schema.bookings).where(eq(schema.bookings.id, booking.id));
        throw e;
      }
    }
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
