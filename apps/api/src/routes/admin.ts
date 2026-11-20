import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import {
  BOOKING_STATUSES,
  HANDOVER_SIDES,
  HANDOVER_STAGES,
  PLANS,
  USER_STATUSES,
  SPIN_SLOTS,
  VAN_STATUSES,
  isIsoDate,
  profileSchema,
  todayIn,
  vanDetailsSchema,
  vanServiceSchema,
} from "@kombi/shared";
import type { Deps } from "../app";
import { currentUser } from "../auth";
import type { UserRow } from "../db/schema";
import { HttpError } from "../errors";
import { createBlock, deleteBlock, listBlocks } from "../services/blocks";
import { getBooking, listBookings, setBookingStatus } from "../services/bookings";
import { deleteDocumentsOf, documentsKey, documentsOf, readDocument } from "../services/documents";
import { ensureSlug, removeLogo, setLogo } from "../services/company";
import { addService, removeService, servicesOf, updateService } from "../services/services";
import type { PhotoStorage } from "../services/storage";
import { handoverOf, removeHandoverVideo, removeSpinVideo, setHandoverVideo, setSpinVideo } from "../services/videos";
import { canBeReviewed, listReviews, markReviewRequested, setReviewHidden } from "../services/reviews";
import { contractFor } from "../services/contract";
import { analyticsFor } from "../services/stats";
import { getUser, hasAnalytics, listUsers, setUserPlan, setUserStatus, updateProfile } from "../services/users";
import {
  addPhoto,
  createVan,
  deleteVan,
  logoUrl,
  orderPhotos,
  removePhoto,
  removeSpinPhoto,
  saveVanContract,
  saveVanPricing,
  saveVanTerms,
  setSpinEnabled,
  setSpinPhoto,
  setVanOwner,
  setVanStatus,
  toOwnerVan,
  updateVan,
  vanForUser,
  vansFor,
} from "../services/vans";

const isoDate = z.string().refine(isIsoDate, "Neispravan datum");
const uuid = z.uuid();
const spinSlot = z.coerce.number().int().min(0).max(SPIN_SLOTS - 1);

const toMe = (u: UserRow, storage: PhotoStorage) => ({ id: u.id, email: u.email, name: u.name, phone: u.phone, address: u.address ?? "", companyId: u.companyId ?? "", representative: u.representative ?? "", vatRegistered: u.vatRegistered, documents: u.documentRules, slug: u.slug, logo: logoUrl(storage, u.logo), role: u.role, status: u.status, plan: u.plan });

/**
 * The admin panel API, for van owners and platform admins. Owners only ever
 * see and change their own vans and the bookings and blocks of those vans.
 */
export function adminRoutes({ db, auth, notifier, storage, config, now }: Deps): Router {
  const r = Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  });

  r.use(auth.requireUser);

  r.get("/me", (_req, res) => {
    res.json(toMe(currentUser(res), storage));
  });

  r.put("/me", async (req, res) => {
    const user = await updateProfile(db.orm, currentUser(res).id, profileSchema.parse(req.body));
    // The company page gets its address with the first saved profile.
    const slug = await ensureSlug(db.orm, user);
    res.json(toMe({ ...user, slug }, storage));
  });

  r.put("/me/logo", upload.single("logo"), async (req, res) => {
    if (!req.file) throw new HttpError(400, "no_file", "Odaberite sliku logotipa.");
    res.json(toMe(await setLogo(db.orm, storage, currentUser(res), req.file.buffer), storage));
  });

  r.delete("/me/logo", async (_req, res) => {
    res.json(toMe(await removeLogo(db.orm, storage, currentUser(res)), storage));
  });

  // Vans

  r.get("/vans", async (_req, res) => {
    res.json((await vansFor(db.orm, currentUser(res))).map((v) => toOwnerVan(storage, v)));
  });

  r.post("/vans", async (req, res) => {
    const user = currentUser(res);
    if (!user.name || !user.phone) throw new HttpError(400, "profile_incomplete", "Prvo upišite ime i telefon u profilu.");
    const van = await createVan(db.orm, user.id, vanDetailsSchema.parse(req.body));
    res.status(201).json(toOwnerVan(storage, van));
  });

  r.get("/vans/:id", async (req, res) => {
    res.json(toOwnerVan(storage, await vanForUser(db.orm, currentUser(res), uuid.parse(req.params.id))));
  });

  r.put("/vans/:id", async (req, res) => {
    const van = await vanForUser(db.orm, currentUser(res), uuid.parse(req.params.id));
    res.json(toOwnerVan(storage, await updateVan(db.orm, van, vanDetailsSchema.parse(req.body))));
  });

  r.put("/vans/:id/pricing", async (req, res) => {
    const van = await vanForUser(db.orm, currentUser(res), uuid.parse(req.params.id));
    res.json(toOwnerVan(storage, await saveVanPricing(db.orm, van, req.body)));
  });

  r.put("/vans/:id/terms", async (req, res) => {
    const van = await vanForUser(db.orm, currentUser(res), uuid.parse(req.params.id));
    res.json(toOwnerVan(storage, await saveVanTerms(db.orm, van, req.body)));
  });

  r.put("/vans/:id/contract", async (req, res) => {
    const van = await vanForUser(db.orm, currentUser(res), uuid.parse(req.params.id));
    res.json(toOwnerVan(storage, await saveVanContract(db.orm, van, req.body)));
  });

  r.patch("/vans/:id/status", async (req, res) => {
    const van = await vanForUser(db.orm, currentUser(res), uuid.parse(req.params.id));
    const { status } = z.object({ status: z.enum(VAN_STATUSES) }).parse(req.body);
    res.json(toOwnerVan(storage, await setVanStatus(db.orm, van, status)));
  });

  r.delete("/vans/:id", async (req, res) => {
    const van = await vanForUser(db.orm, currentUser(res), uuid.parse(req.params.id));
    await deleteVan(db.orm, storage, van);
    res.status(204).end();
  });

  r.post("/vans/:id/photos", upload.single("photo"), async (req, res) => {
    const van = await vanForUser(db.orm, currentUser(res), uuid.parse(req.params.id));
    if (!req.file) throw new HttpError(400, "no_file", "Odaberite fotografiju.");
    res.status(201).json(toOwnerVan(storage, await addPhoto(db.orm, storage, van, req.file.buffer)));
  });

  r.delete("/vans/:id/photos/:photoId", async (req, res) => {
    const van = await vanForUser(db.orm, currentUser(res), uuid.parse(req.params.id));
    res.json(toOwnerVan(storage, await removePhoto(db.orm, storage, van, uuid.parse(req.params.photoId))));
  });

  r.put("/vans/:id/photos/order", async (req, res) => {
    const van = await vanForUser(db.orm, currentUser(res), uuid.parse(req.params.id));
    const { ids } = z.object({ ids: z.array(uuid).max(50) }).parse(req.body);
    res.json(toOwnerVan(storage, await orderPhotos(db.orm, van, ids)));
  });

  // 360° view: a switch, and one photo per clock position

  r.patch("/vans/:id/spin", async (req, res) => {
    const van = await vanForUser(db.orm, currentUser(res), uuid.parse(req.params.id));
    const { enabled } = z.object({ enabled: z.boolean() }).parse(req.body);
    res.json(toOwnerVan(storage, await setSpinEnabled(db.orm, van, enabled)));
  });

  r.put("/vans/:id/spin/:slot", upload.single("photo"), async (req, res) => {
    const van = await vanForUser(db.orm, currentUser(res), uuid.parse(req.params.id));
    if (!req.file) throw new HttpError(400, "no_file", "Odaberite fotografiju.");
    res.json(toOwnerVan(storage, await setSpinPhoto(db.orm, storage, van, spinSlot.parse(req.params.slot), req.file.buffer)));
  });

  r.delete("/vans/:id/spin/:slot", async (req, res) => {
    const van = await vanForUser(db.orm, currentUser(res), uuid.parse(req.params.id));
    res.json(toOwnerVan(storage, await removeSpinPhoto(db.orm, storage, van, spinSlot.parse(req.params.slot))));
  });

  /** A walk-around video, shown with the 360° view. The body is the video itself. */
  r.put("/vans/:id/spin-video", async (req, res) => {
    const van = await vanForUser(db.orm, currentUser(res), uuid.parse(req.params.id));
    res.json(toOwnerVan(storage, await setSpinVideo(db.orm, storage, van, req)));
  });

  r.delete("/vans/:id/spin-video", async (req, res) => {
    const van = await vanForUser(db.orm, currentUser(res), uuid.parse(req.params.id));
    res.json(toOwnerVan(storage, await removeSpinVideo(db.orm, storage, van)));
  });

  // Service history

  r.get("/vans/:id/services", async (req, res) => {
    const van = await vanForUser(db.orm, currentUser(res), uuid.parse(req.params.id));
    res.json(await servicesOf(db.orm, van.id));
  });

  r.post("/vans/:id/services", async (req, res) => {
    const van = await vanForUser(db.orm, currentUser(res), uuid.parse(req.params.id));
    await addService(db.orm, van.id, vanServiceSchema.parse(req.body));
    res.status(201).json(await servicesOf(db.orm, van.id));
  });

  r.put("/vans/:id/services/:sid", async (req, res) => {
    const van = await vanForUser(db.orm, currentUser(res), uuid.parse(req.params.id));
    await updateService(db.orm, van.id, uuid.parse(req.params.sid), vanServiceSchema.parse(req.body));
    res.json(await servicesOf(db.orm, van.id));
  });

  r.delete("/vans/:id/services/:sid", async (req, res) => {
    const van = await vanForUser(db.orm, currentUser(res), uuid.parse(req.params.id));
    await removeService(db.orm, van.id, uuid.parse(req.params.sid));
    res.json(await servicesOf(db.orm, van.id));
  });

  // Bookings

  r.get("/bookings", async (req, res) => {
    const status = z.enum(BOOKING_STATUSES).optional().parse(req.query.status);
    const vanId = uuid.optional().parse(req.query.vanId);
    const list = await listBookings(db.orm, currentUser(res), { status, vanId, upcoming: req.query.upcoming === "1" });
    const [docs, videos] = await Promise.all([documentsOf(db.orm, list.map((b) => b.id)), handoverOf(db.orm, storage, list.map((b) => b.id))]);
    res.json(list.map((b) => ({ ...b, documents: docs.get(b.id) ?? [], handover: videos.get(b.id) ?? [] })));
  });

  r.patch("/bookings/:id", async (req, res) => {
    const id = uuid.parse(req.params.id);
    const { status } = z.object({ status: z.enum(["confirmed", "declined", "cancelled"]) }).parse(req.body);
    const booking = await setBookingStatus(db.orm, currentUser(res), id, status);
    if (status === "confirmed") void notifier.bookingConfirmed(booking);
    // No rental, so no reason to keep the customer's documents.
    if (status !== "confirmed") await deleteDocumentsOf(db.orm, storage, booking.id);
    const [docs, videos] = await Promise.all([documentsOf(db.orm, [booking.id]), handoverOf(db.orm, storage, [booking.id])]);
    res.json({ ...booking, documents: docs.get(booking.id) ?? [], handover: videos.get(booking.id) ?? [] });
  });

  /** A photo of the customer's document, for the owner of the van (or a platform admin). Never cached. */
  r.get("/bookings/:id/documents/:docId", async (req, res) => {
    const booking = await getBooking(db.orm, currentUser(res), uuid.parse(req.params.id));
    if (!booking) throw new HttpError(404, "not_found", "Rezervacija ne postoji.");
    const jpeg = await readDocument(db.orm, storage, documentsKey(config), booking.id, uuid.parse(req.params.docId));
    res.set({ "Cache-Control": "private, no-store", "Content-Disposition": "inline" });
    res.type("image/jpeg").send(jpeg);
  });

  /**
   * Digital handover record: the owner films each side of the vehicle at pickup
   * and at return. The body is the video itself; the customer sees them with the contract.
   */
  r.put("/bookings/:id/handover/:stage/:side", async (req, res) => {
    const booking = await getBooking(db.orm, currentUser(res), uuid.parse(req.params.id));
    if (!booking) throw new HttpError(404, "not_found", "Rezervacija ne postoji.");
    if (booking.status !== "confirmed") throw new HttpError(409, "not_confirmed", "Zapisnik se pravi za potvrđenu rezervaciju.");
    const stage = z.enum(HANDOVER_STAGES).parse(req.params.stage);
    const side = z.enum(HANDOVER_SIDES).parse(req.params.side);
    await setHandoverVideo(db.orm, storage, booking.id, stage, side, req);
    res.json((await handoverOf(db.orm, storage, [booking.id])).get(booking.id) ?? []);
  });

  r.delete("/bookings/:id/handover/:stage/:side", async (req, res) => {
    const booking = await getBooking(db.orm, currentUser(res), uuid.parse(req.params.id));
    if (!booking) throw new HttpError(404, "not_found", "Rezervacija ne postoji.");
    await removeHandoverVideo(db.orm, storage, booking.id, z.enum(HANDOVER_STAGES).parse(req.params.stage), z.enum(HANDOVER_SIDES).parse(req.params.side));
    res.json((await handoverOf(db.orm, storage, [booking.id])).get(booking.id) ?? []);
  });

  /** After the rental: emails the customer the link to rate it. */
  r.post("/bookings/:id/review-request", async (req, res) => {
    const booking = await getBooking(db.orm, currentUser(res), uuid.parse(req.params.id));
    if (!booking) throw new HttpError(404, "not_found", "Rezervacija ne postoji.");
    if (!canBeReviewed(booking, todayIn(config.BUSINESS_TZ, now())))
      throw new HttpError(409, "not_reviewable", "Ocjenu možete zatražiti za potvrđen najam nakon dana povratka.");
    await notifier.reviewRequest(booking);
    await markReviewRequested(db.orm, booking.id);
    res.json({ ...booking, reviewRequestedAt: new Date() });
  });

  // Reviews (platform admin)

  r.get("/reviews", auth.requireAdmin, async (_req, res) => {
    res.json((await listReviews(db.orm)).map(({ review, vanName, vanSlug }) => ({ ...review, vanName, vanSlug })));
  });

  r.patch("/reviews/:id", auth.requireAdmin, async (req, res) => {
    const { hidden } = z.object({ hidden: z.boolean() }).parse(req.body);
    res.json(await setReviewHidden(db.orm, currentUser(res), uuid.parse(req.params.id), hidden));
  });

  /** The rental contract for a booking, filled in from the request, the van and its owner. */
  r.get("/bookings/:id/contract", async (req, res) => {
    res.json(await contractFor(db.orm, storage, currentUser(res), uuid.parse(req.params.id), todayIn(config.BUSINESS_TZ, now())));
  });

  // Blocked days

  r.get("/blocks", async (_req, res) => {
    res.json(await listBlocks(db.orm, currentUser(res)));
  });

  r.post("/blocks", async (req, res) => {
    const body = z
      .object({ vanId: uuid, start: isoDate, end: isoDate, reason: z.string().trim().max(200).optional() })
      .refine((b) => b.end >= b.start, { path: ["end"], message: "Kraj mora biti nakon početka" })
      .parse(req.body);
    await vanForUser(db.orm, currentUser(res), body.vanId);
    res.status(201).json(await createBlock(db.orm, { ...body, reason: body.reason ?? null }));
  });

  r.delete("/blocks/:id", async (req, res) => {
    if (!(await deleteBlock(db.orm, currentUser(res), uuid.parse(req.params.id)))) {
      throw new HttpError(404, "not_found", "Ne postoji.");
    }
    res.status(204).end();
  });

  // Analytics: part of the paid packages

  r.get("/analytics", async (req, res) => {
    const user = currentUser(res);
    if (!hasAnalytics(user)) throw new HttpError(403, "plan_required", "Analitika je dio paketa Bronze, Silver i Gold.");
    const q = z.object({ days: z.coerce.number().int().min(7).max(365).default(30), vanId: uuid.optional() }).parse(req.query);
    res.json(await analyticsFor(db.orm, user, { ...q, today: todayIn(config.BUSINESS_TZ, now()), tz: config.BUSINESS_TZ }));
  });

  // Platform admins only

  r.get("/users", auth.requireAdmin, async (_req, res) => {
    res.json((await listUsers(db.orm)).map((u) => toMe(u, storage)));
  });

  r.patch("/users/:id", auth.requireAdmin, async (req, res) => {
    const id = uuid.parse(req.params.id);
    const { status, plan } = z
      .object({ status: z.enum(USER_STATUSES).optional(), plan: z.enum(PLANS).optional() })
      .refine((b) => b.status || b.plan, { message: "Nema promjene" })
      .parse(req.body);
    const target = await getUser(db.orm, id);
    if (!target) throw new HttpError(404, "not_found", "Korisnik ne postoji.");
    if (target.role === "admin") throw new HttpError(400, "is_admin", "Administratori se mijenjaju preko PLATFORM_ADMIN_EMAILS.");
    let updated = target;
    if (plan) updated = await setUserPlan(db.orm, id, plan);
    if (status) updated = await setUserStatus(db.orm, id, status);
    res.json(toMe(updated, storage));
  });

  r.patch("/vans/:id/owner", auth.requireAdmin, async (req, res) => {
    const van = await vanForUser(db.orm, currentUser(res), uuid.parse(req.params.id));
    const { ownerId } = z.object({ ownerId: uuid.nullable() }).parse(req.body);
    res.json(toOwnerVan(storage, await setVanOwner(db.orm, van, ownerId)));
  });

  return r;
}
