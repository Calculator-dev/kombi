import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import {
  BOOKING_STATUSES,
  USER_STATUSES,
  VAN_STATUSES,
  isIsoDate,
  profileSchema,
  vanDetailsSchema,
} from "@kombi/shared";
import type { Deps } from "../app";
import { currentUser } from "../auth";
import type { UserRow } from "../db/schema";
import { HttpError } from "../errors";
import { createBlock, deleteBlock, listBlocks } from "../services/blocks";
import { listBookings, setBookingStatus } from "../services/bookings";
import { getUser, listUsers, setUserStatus, updateProfile } from "../services/users";
import {
  addPhoto,
  createVan,
  deleteVan,
  orderPhotos,
  removePhoto,
  saveVanPricing,
  saveVanTerms,
  setVanOwner,
  setVanStatus,
  toOwnerVan,
  updateVan,
  vanForUser,
  vansFor,
} from "../services/vans";

const isoDate = z.string().refine(isIsoDate, "Neispravan datum");
const uuid = z.uuid();

const toMe = (u: UserRow) => ({ id: u.id, email: u.email, name: u.name, phone: u.phone, role: u.role, status: u.status });

/**
 * The admin panel API, for van owners and platform admins. Owners only ever
 * see and change their own vans and the bookings and blocks of those vans.
 */
export function adminRoutes({ db, auth, notifier, storage }: Deps): Router {
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

  // Platform admins only

  r.get("/users", auth.requireAdmin, async (_req, res) => {
    res.json((await listUsers(db.orm)).map(toMe));
  });

  r.patch("/users/:id", auth.requireAdmin, async (req, res) => {
    const id = uuid.parse(req.params.id);
    const { status } = z.object({ status: z.enum(USER_STATUSES) }).parse(req.body);
    const target = await getUser(db.orm, id);
    if (!target) throw new HttpError(404, "not_found", "Korisnik ne postoji.");
    if (target.role === "admin") throw new HttpError(400, "is_admin", "Administratori se mijenjaju preko PLATFORM_ADMIN_EMAILS.");
    res.json(toMe(await setUserStatus(db.orm, id, status)));
  });

  r.patch("/vans/:id/owner", auth.requireAdmin, async (req, res) => {
    const van = await vanForUser(db.orm, currentUser(res), uuid.parse(req.params.id));
    const { ownerId } = z.object({ ownerId: uuid.nullable() }).parse(req.body);
    res.json(toOwnerVan(storage, await setVanOwner(db.orm, van, ownerId)));
  });

  return r;
}
