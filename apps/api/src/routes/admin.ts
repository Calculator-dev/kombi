import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import {
  BOOKING_STATUSES,
  PLANS,
  USER_STATUSES,
  SPIN_SLOTS,
  VAN_STATUSES,
  isIsoDate,
  profileSchema,
  todayIn,
  vanDetailsSchema,
} from "@kombi/shared";
import type { Deps } from "../app";
import { currentUser } from "../auth";
import type { UserRow } from "../db/schema";
import { HttpError } from "../errors";
import { createBlock, deleteBlock, listBlocks } from "../services/blocks";
import { getBooking, listBookings, setBookingStatus } from "../services/bookings";
import { canBeReviewed, listReviews, markReviewRequested, setReviewHidden } from "../services/reviews";
import { contractFor } from "../services/contract";
import { analyticsFor } from "../services/stats";
import { getUser, hasAnalytics, listUsers, setUserPlan, setUserStatus, updateProfile } from "../services/users";
import {
  addPhoto,
  createVan,
  deleteVan,
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

const toMe = (u: UserRow) => ({ id: u.id, email: u.email, name: u.name, phone: u.phone, address: u.address ?? "", companyId: u.companyId ?? "", representative: u.representative ?? "", vatRegistered: u.vatRegistered, role: u.role, status: u.status, plan: u.plan });

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
    res.json(toMe(currentUser(res)));
  });

  r.put("/me", async (req, res) => {
    res.json(toMe(await updateProfile(db.orm, currentUser(res).id, profileSchema.parse(req.body))));
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

  // Bookings

  r.get("/bookings", async (req, res) => {
    const status = z.enum(BOOKING_STATUSES).optional().parse(req.query.status);
    const vanId = uuid.optional().parse(req.query.vanId);
    res.json(await listBookings(db.orm, currentUser(res), { status, vanId, upcoming: req.query.upcoming === "1" }));
  });

  r.patch("/bookings/:id", async (req, res) => {
    const id = uuid.parse(req.params.id);
    const { status } = z.object({ status: z.enum(["confirmed", "declined", "cancelled"]) }).parse(req.body);
    const booking = await setBookingStatus(db.orm, currentUser(res), id, status);
    if (status === "confirmed") void notifier.bookingConfirmed(booking);
    res.json(booking);
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
    res.json(await contractFor(db.orm, currentUser(res), uuid.parse(req.params.id), todayIn(config.BUSINESS_TZ, now())));
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
    res.json((await listUsers(db.orm)).map(toMe));
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
    res.json(toMe(updated));
  });

  r.patch("/vans/:id/owner", auth.requireAdmin, async (req, res) => {
    const van = await vanForUser(db.orm, currentUser(res), uuid.parse(req.params.id));
    const { ownerId } = z.object({ ownerId: uuid.nullable() }).parse(req.body);
    res.json(toOwnerVan(storage, await setVanOwner(db.orm, van, ownerId)));
  });

  return r;
}
