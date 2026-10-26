import { and, asc, count, eq, inArray, isNull, or, sql } from "drizzle-orm";
import {
  DEFAULT_SETTINGS,
  DEFAULT_TERMS,
  MAX_PHOTOS,
  settingsSchema,
  slugify,
  termsSchema,
  upgradeSettings,
  type PhotoUrls,
  type PublicVan,
  type Settings,
  type Terms,
  type VanCard,
  type VanDetails,
  type VanStatus,
} from "@kombi/shared";
import { schema, type Executor } from "../db";
import type { StoredPhoto, UserRow, VanRow } from "../db/schema";
import { HttpError } from "../errors";
import { storePhoto, type PhotoStorage } from "./storage";

const { vans, users, bookings } = schema;

/** A van's prices, brought up to the current shape (older rows may predate a change). */
export function pricingOf(van: Pick<VanRow, "pricing">): Settings {
  const parsed = settingsSchema.safeParse(upgradeSettings({ ...DEFAULT_SETTINGS, ...van.pricing }));
  return parsed.success ? parsed.data : structuredClone(DEFAULT_SETTINGS);
}

/** A van's rental terms, with defaults for anything its owner hasn't set. */
export function termsOf(van: Pick<VanRow, "terms">): Terms {
  const parsed = termsSchema.safeParse({ ...DEFAULT_TERMS, ...van.terms });
  return parsed.success ? parsed.data : structuredClone(DEFAULT_TERMS);
}

/** Vans the public site shows: published, and run by the platform or an approved owner. */
const isPublic = and(eq(vans.status, "published"), or(isNull(vans.ownerId), eq(users.status, "approved")));

export async function listPublicVans(db: Executor): Promise<VanRow[]> {
  const rows = await db
    .select({ van: vans })
    .from(vans)
    .leftJoin(users, eq(users.id, vans.ownerId))
    .where(isPublic)
    .orderBy(asc(vans.createdAt));
  return rows.map((r) => r.van);
}

export async function getPublicVan(db: Executor, by: { slug: string } | { id: string }): Promise<VanRow | null> {
  const [row] = await db
    .select({ van: vans })
    .from(vans)
    .leftJoin(users, eq(users.id, vans.ownerId))
    .where(and(isPublic, "slug" in by ? eq(vans.slug, by.slug) : eq(vans.id, by.id)));
  return row?.van ?? null;
}

/** Vans a user manages: their own, or every van for an admin. */
export async function vansFor(db: Executor, user: UserRow): Promise<VanRow[]> {
  return db
    .select()
    .from(vans)
    .where(user.role === "admin" ? undefined : eq(vans.ownerId, user.id))
    .orderBy(asc(vans.createdAt));
}

/**
 * The van with this id, if the user may manage it. Someone else's van is
 * reported as missing (404), so ids of other owners' vans reveal nothing.
 */
export async function vanForUser(db: Executor, user: UserRow, id: string): Promise<VanRow> {
  const [row] = await db
    .select()
    .from(vans)
    .where(and(eq(vans.id, id), user.role === "admin" ? undefined : eq(vans.ownerId, user.id)));
  if (!row) throw new HttpError(404, "not_found", "Kombi ne postoji.");
  return row;
}

async function uniqueSlug(db: Executor, name: string, exceptId?: string): Promise<string> {
  const base = slugify(name);
  const taken = new Set(
    (await db.select({ slug: vans.slug, id: vans.id }).from(vans).where(sql`${vans.slug} like ${base + "%"}`))
      .filter((r) => r.id !== exceptId)
      .map((r) => r.slug),
  );
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
}

export async function createVan(db: Executor, ownerId: string | null, details: VanDetails): Promise<VanRow> {
  const [row] = await db
    .insert(vans)
    .values({ ...details, ownerId, slug: await uniqueSlug(db, details.name), status: "draft", pricing: DEFAULT_SETTINGS })
    .returning();
  return row!;
}

export async function updateVan(db: Executor, van: VanRow, details: VanDetails): Promise<VanRow> {
  // The address stays the same once a van is public, so shared links keep working.
  const slug = van.status === "draft" && details.name !== van.name ? await uniqueSlug(db, details.name, van.id) : van.slug;
  const [row] = await db
    .update(vans)
    .set({ ...details, slug, updatedAt: sql`now()` })
    .where(eq(vans.id, van.id))
    .returning();
  return row!;
}

export async function saveVanPricing(db: Executor, van: VanRow, input: unknown): Promise<VanRow> {
  const pricing = settingsSchema.parse(input);
  const [row] = await db.update(vans).set({ pricing, updatedAt: sql`now()` }).where(eq(vans.id, van.id)).returning();
  return row!;
}

export async function saveVanTerms(db: Executor, van: VanRow, input: unknown): Promise<VanRow> {
  const terms = termsSchema.parse(input);
  const [row] = await db.update(vans).set({ terms, updatedAt: sql`now()` }).where(eq(vans.id, van.id)).returning();
  return row!;
}

export async function setVanStatus(db: Executor, van: VanRow, status: VanStatus): Promise<VanRow> {
  if (status === "published" && van.photos.length === 0) {
    throw new HttpError(400, "no_photos", "Dodajte barem jednu fotografiju prije objave.");
  }
  const [row] = await db.update(vans).set({ status, updatedAt: sql`now()` }).where(eq(vans.id, van.id)).returning();
  return row!;
}

export async function setVanOwner(db: Executor, van: VanRow, ownerId: string | null): Promise<VanRow> {
  if (ownerId) {
    const [owner] = await db.select({ id: users.id }).from(users).where(eq(users.id, ownerId));
    if (!owner) throw new HttpError(404, "not_found", "Korisnik ne postoji.");
  }
  const [row] = await db.update(vans).set({ ownerId, updatedAt: sql`now()` }).where(eq(vans.id, van.id)).returning();
  return row!;
}

export async function deleteVan(db: Executor, storage: PhotoStorage, van: VanRow): Promise<void> {
  const [b] = await db.select({ n: count() }).from(bookings).where(eq(bookings.vanId, van.id));
  if ((b?.n ?? 0) > 0) {
    throw new HttpError(409, "has_bookings", "Kombi ima rezervacije pa se ne može obrisati. Sakrijte ga umjesto toga.");
  }
  await db.delete(vans).where(eq(vans.id, van.id));
  await storage.remove(van.photos.flatMap((p) => [p.key, p.thumbKey])).catch((err) => console.error("[storage]", err));
}

export async function addPhoto(db: Executor, storage: PhotoStorage, van: VanRow, file: Buffer): Promise<VanRow> {
  if (van.photos.length >= MAX_PHOTOS) throw new HttpError(400, "too_many_photos", `Najviše ${MAX_PHOTOS} fotografija.`);
  const photo = await storePhoto(storage, van.id, file);
  // Append in SQL, so two uploads at the same time both end up in the list.
  const [row] = await db
    .update(vans)
    .set({ photos: sql`${vans.photos} || ${JSON.stringify([photo])}::jsonb`, updatedAt: sql`now()` })
    .where(eq(vans.id, van.id))
    .returning();
  return row!;
}

export async function removePhoto(db: Executor, storage: PhotoStorage, van: VanRow, photoId: string): Promise<VanRow> {
  const photo = van.photos.find((p) => p.id === photoId);
  if (!photo) throw new HttpError(404, "not_found", "Fotografija ne postoji.");
  const photos = van.photos.filter((p) => p.id !== photoId);
  const [row] = await db.update(vans).set({ photos, updatedAt: sql`now()` }).where(eq(vans.id, van.id)).returning();
  await storage.remove([photo.key, photo.thumbKey]).catch((err) => console.error("[storage]", err));
  return row!;
}

/** Saves a new photo order; the first photo is the cover. */
export async function orderPhotos(db: Executor, van: VanRow, ids: string[]): Promise<VanRow> {
  const byId = new Map(van.photos.map((p) => [p.id, p]));
  if (ids.length !== van.photos.length || !ids.every((id) => byId.has(id))) {
    throw new HttpError(400, "invalid_order", "Popis fotografija nije potpun. Osvježite stranicu.");
  }
  const photos = ids.map((id) => byId.get(id)!) as StoredPhoto[];
  const [row] = await db.update(vans).set({ photos, updatedAt: sql`now()` }).where(eq(vans.id, van.id)).returning();
  return row!;
}

export async function vanNames(db: Executor, ids: string[]): Promise<Map<string, string>> {
  if (!ids.length) return new Map();
  const rows = await db.select({ id: vans.id, name: vans.name }).from(vans).where(inArray(vans.id, ids));
  return new Map(rows.map((r) => [r.id, r.name]));
}

const details = (v: VanRow) => ({
  name: v.name,
  year: v.year,
  seats: v.seats,
  fuel: v.fuel as VanDetails["fuel"],
  gearbox: v.gearbox as VanDetails["gearbox"],
  engine: v.engine,
  license: v.license,
  location: v.location,
  description: v.description,
});

export function photoUrls(storage: PhotoStorage, p: StoredPhoto): PhotoUrls {
  return { id: p.id, url: storage.url(p.key), thumbUrl: storage.url(p.thumbKey), width: p.width, height: p.height };
}

export function toPublicVan(storage: PhotoStorage, v: VanRow): PublicVan {
  return { id: v.id, slug: v.slug, ...details(v), photos: v.photos.map((p) => photoUrls(storage, p)), pricing: pricingOf(v), terms: termsOf(v) };
}

export function toCard(storage: PhotoStorage, v: VanRow): VanCard {
  return {
    id: v.id,
    slug: v.slug,
    name: v.name,
    year: v.year,
    seats: v.seats,
    fuel: v.fuel as VanDetails["fuel"],
    gearbox: v.gearbox as VanDetails["gearbox"],
    location: v.location,
    photo: v.photos[0] ? photoUrls(storage, v.photos[0]) : null,
    dailyRate: pricingOf(v).dailyRate,
  };
}

/** A van as its owner sees it in the admin panel. */
export function toOwnerVan(storage: PhotoStorage, v: VanRow) {
  return { ...toPublicVan(storage, v), status: v.status, ownerId: v.ownerId, updatedAt: v.updatedAt };
}
