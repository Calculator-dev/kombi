import { and, asc, count, eq, gte, inArray, isNull, or, sql } from "drizzle-orm";
import {
  DEFAULT_CONTRACT_TERMS,
  DEFAULT_SETTINGS,
  contractTermsSchema,
  PLAN_INFO,
  kindOf,
  planAllows,
  planVans,
  DEFAULT_TERMS,
  MAX_PHOTOS,
  SEARCH_PAGE_SIZE,
  SPIN_SLOTS,
  quote,
  settingsSchema,
  slugify,
  termsSchema,
  upgradeSettings,
  type ContractTerms,
  type PhotoUrls,
  type PublicVan,
  type SearchResult,
  type Settings,
  type Terms,
  type VanCard,
  type VanDetails,
  type VanLimits,
  type VanSearch,
  type VehicleKind,
  type VanStatus,
} from "@kombi/shared";
import { schema, type Database, type Executor } from "../db";
import { ratingsOf } from "./reviews";
import { lockVanCalendar } from "./availability";
import type { SpinPhoto, StoredPhoto, UserRow, VanRow } from "../db/schema";
import { HttpError } from "../errors";
import { busyVans } from "./availability";
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

/** What the rental contract says about this van, with the sample contract's values where nothing is set. */
export function contractTermsOf(van: Pick<VanRow, "contract">): ContractTerms {
  const parsed = contractTermsSchema.safeParse({ ...DEFAULT_CONTRACT_TERMS, ...van.contract });
  return parsed.success ? parsed.data : structuredClone(DEFAULT_CONTRACT_TERMS);
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

/** The name a van's owner shows on their profile; null for vans the platform runs itself. */
export async function ownerNameOf(db: Executor, van: VanRow): Promise<string | null> {
  return (await ownerOf(db, van))?.name ?? null;
}

/** What the public page says about a van's owner: profile name and VAT status. Null for the platform's own vans. */
export async function ownerOf(db: Executor, van: VanRow): Promise<{ name: string | null; vat: boolean } | null> {
  if (!van.ownerId) return null;
  const [row] = await db.select({ name: users.name, vat: users.vatRegistered }).from(users).where(eq(users.id, van.ownerId));
  return row ? { name: row.name?.trim() || null, vat: row.vat } : null;
}

/**
 * Mileage and damage terms for the public page. Only what the owner actually
 * saved for the contract: the sample contract's defaults are not shown as theirs.
 */
export function publicLimits(van: Pick<VanRow, "contract">): VanLimits {
  const c = contractTermsOf(van);
  const set = (k: keyof VanLimits) => k in van.contract;
  return {
    kmPerDay: set("kmPerDay") ? c.kmPerDay : undefined,
    extraKm: set("extraKm") && c.extraKm ? c.extraKm : undefined,
    damageFee: set("damageFee") ? c.damageFee : undefined,
  };
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
  // Turning a published van into a car (or back) counts against the other limit.
  if (van.status === "published" && kindOf(details.category) !== kindOf(van.category)) {
    await checkPlanLimit(db, van.ownerId, van.id, kindOf(details.category));
  }
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

export async function saveVanContract(db: Executor, van: VanRow, input: unknown): Promise<VanRow> {
  const contract = contractTermsSchema.parse(input);
  const [row] = await db.update(vans).set({ contract, updatedAt: sql`now()` }).where(eq(vans.id, van.id)).returning();
  return row!;
}

/**
 * An owner's package limits how many vehicles can be published at once: on
 * Free one van and one car, on the paid ones a number of vehicles of either
 * kind. Vans the platform runs itself, and admins, have no limit.
 */
async function checkPlanLimit(db: Executor, ownerId: string | null, exceptVanId: string, kind: VehicleKind): Promise<void> {
  if (!ownerId) return;
  const [owner] = await db.select().from(users).where(eq(users.id, ownerId));
  if (!owner || owner.role === "admin") return;
  if (!PLAN_INFO[owner.plan].limit) return;
  const live = await publishedCount(db, ownerId, exceptVanId);
  live[kind] += 1;
  if (!planAllows(owner.plan, live)) {
    const each = "each" in (PLAN_INFO[owner.plan].limit ?? {});
    const other = each ? (kind === "car" ? "drugi auto" : "drugi kombi") : "neko drugo vozilo";
    throw new HttpError(
      403,
      "plan_limit",
      `Paket ${PLAN_INFO[owner.plan].label} dozvoljava ${planVans(owner.plan)} na stranici. Sakrijte ${other} ili pređite na veći paket.`,
    );
  }
}

/** Published vans and published cars of an owner, for checking a package change. */
export async function publishedCount(db: Executor, ownerId: string, exceptVanId?: string): Promise<Record<VehicleKind, number>> {
  const rows = await db
    .select({ category: vans.category, n: count() })
    .from(vans)
    .where(and(eq(vans.ownerId, ownerId), eq(vans.status, "published"), exceptVanId ? sql`${vans.id} <> ${exceptVanId}` : undefined))
    .groupBy(vans.category);
  const counts = { van: 0, car: 0 };
  for (const r of rows) counts[kindOf(r.category)] += r.n;
  return counts;
}

export async function setVanStatus(db: Executor, van: VanRow, status: VanStatus): Promise<VanRow> {
  if (status === "published" && van.photos.length === 0) {
    throw new HttpError(400, "no_photos", "Dodajte barem jednu fotografiju prije objave.");
  }
  if (status === "published" && van.status !== "published") await checkPlanLimit(db, van.ownerId, van.id, kindOf(van.category));
  const [row] = await db.update(vans).set({ status, updatedAt: sql`now()` }).where(eq(vans.id, van.id)).returning();
  return row!;
}

export async function setVanOwner(db: Executor, van: VanRow, ownerId: string | null): Promise<VanRow> {
  if (ownerId) {
    const [owner] = await db.select({ id: users.id }).from(users).where(eq(users.id, ownerId));
    if (!owner) throw new HttpError(404, "not_found", "Korisnik ne postoji.");
    if (van.status === "published" && ownerId !== van.ownerId) await checkPlanLimit(db, ownerId, van.id, kindOf(van.category));
  }
  const [row] = await db.update(vans).set({ ownerId, updatedAt: sql`now()` }).where(eq(vans.id, van.id)).returning();
  return row!;
}

/**
 * Deletes a van with its photos. Declined and cancelled requests go with it;
 * pending and confirmed bookings keep it (a finished rental stays on record),
 * so such a van can only be hidden.
 */
export async function deleteVan(db: Database, storage: PhotoStorage, van: VanRow): Promise<void> {
  await db.transaction(async (tx) => {
    // Same lock as a new booking takes, so none can slip in while deleting.
    await lockVanCalendar(tx, van.id);
    const [active] = await tx
      .select({ n: count() })
      .from(bookings)
      .where(and(eq(bookings.vanId, van.id), inArray(bookings.status, ["pending", "confirmed"])));
    const n = active?.n ?? 0;
    if (n > 0) {
      throw new HttpError(
        409,
        "has_bookings",
        `Kombi ima ${n} ${n === 1 ? "potvrđenu rezervaciju ili upit" : "potvrđenih rezervacija ili upita"} na čekanju, pa se ne može obrisati. ` +
          "Upite na čekanju odbijte, a ako ima potvrđenih rezervacija, sakrijte kombi umjesto brisanja.",
      );
    }
    await tx.delete(bookings).where(eq(bookings.vanId, van.id));
    await tx.delete(vans).where(eq(vans.id, van.id));
  });
  await storage
    .remove([...van.photos, ...van.spinPhotos].flatMap((p) => [p.key, p.thumbKey]))
    .catch((err) => console.error("[storage]", err));
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

/** Switches the 360° view on or off. Its photos stay either way. */
export async function setSpinEnabled(db: Executor, van: VanRow, enabled: boolean): Promise<VanRow> {
  const [row] = await db.update(vans).set({ spinEnabled: enabled, updatedAt: sql`now()` }).where(eq(vans.id, van.id)).returning();
  return row!;
}

/** Puts a photo in one slot of the 360° view, replacing the one there. */
export async function setSpinPhoto(db: Executor, storage: PhotoStorage, van: VanRow, slot: number, file: Buffer): Promise<VanRow> {
  const photo: SpinPhoto = { ...(await storePhoto(storage, van.id, file, "whole")), slot };
  const old = van.spinPhotos.find((p) => p.slot === slot);
  const spinPhotos = [...van.spinPhotos.filter((p) => p.slot !== slot), photo].sort((a, b) => a.slot - b.slot);
  const [row] = await db.update(vans).set({ spinPhotos, updatedAt: sql`now()` }).where(eq(vans.id, van.id)).returning();
  if (old) await storage.remove([old.key, old.thumbKey]).catch((err) => console.error("[storage]", err));
  return row!;
}

export async function removeSpinPhoto(db: Executor, storage: PhotoStorage, van: VanRow, slot: number): Promise<VanRow> {
  const old = van.spinPhotos.find((p) => p.slot === slot);
  if (!old) throw new HttpError(404, "not_found", "Fotografija ne postoji.");
  const spinPhotos = van.spinPhotos.filter((p) => p.slot !== slot);
  const [row] = await db.update(vans).set({ spinPhotos, updatedAt: sql`now()` }).where(eq(vans.id, van.id)).returning();
  await storage.remove([old.key, old.thumbKey]).catch((err) => console.error("[storage]", err));
  return row!;
}

/** The 360° view for the site: only when switched on and complete, so it never jumps over a gap. */
function publicSpin(storage: PhotoStorage, v: VanRow): PhotoUrls[] | null {
  if (!v.spinEnabled || v.spinPhotos.length < SPIN_SLOTS) return null;
  return [...v.spinPhotos].sort((a, b) => a.slot - b.slot).map((p) => photoUrls(storage, p));
}

export async function vanNames(db: Executor, ids: string[]): Promise<Map<string, string>> {
  if (!ids.length) return new Map();
  const rows = await db.select({ id: vans.id, name: vans.name }).from(vans).where(inArray(vans.id, ids));
  return new Map(rows.map((r) => [r.id, r.name]));
}

const details = (v: VanRow) => ({
  name: v.name,
  category: v.category,
  cargoM3: v.cargoM3,
  payloadKg: v.payloadKg,
  year: v.year,
  seats: v.seats,
  fuel: v.fuel as VanDetails["fuel"],
  gearbox: v.gearbox as VanDetails["gearbox"],
  engine: v.engine,
  license: v.license,
  location: v.location,
  description: v.description,
  luggage: v.luggage,
  powerHp: v.powerHp,
  features: v.features as VanDetails["features"],
});

export function photoUrls(storage: PhotoStorage, p: StoredPhoto): PhotoUrls {
  return { id: p.id, url: storage.url(p.key), thumbUrl: storage.url(p.thumbKey), width: p.width, height: p.height };
}

export function toPublicVan(storage: PhotoStorage, v: VanRow): PublicVan {
  return {
    id: v.id,
    slug: v.slug,
    ...details(v),
    photos: v.photos.map((p) => photoUrls(storage, p)),
    spin: publicSpin(storage, v),
    pricing: pricingOf(v),
    terms: termsOf(v),
  };
}

export function toCard(storage: PhotoStorage, v: VanRow): VanCard {
  return {
    id: v.id,
    slug: v.slug,
    name: v.name,
    category: v.category,
    cargoM3: v.cargoM3,
    payloadKg: v.payloadKg,
    year: v.year,
    seats: v.seats,
    fuel: v.fuel as VanDetails["fuel"],
    gearbox: v.gearbox as VanDetails["gearbox"],
    location: v.location,
    luggage: v.luggage,
    powerHp: v.powerHp,
    features: v.features as VanDetails["features"],
    photo: v.photos[0] ? photoUrls(storage, v.photos[0]) : null,
    dailyRate: pricingOf(v).dailyRate,
    priceOnRequest: pricingOf(v).priceOnRequest,
  };
}

/** A van as its owner sees it in the admin panel. */
export function toOwnerVan(storage: PhotoStorage, v: VanRow) {
  const slots = Array.from({ length: SPIN_SLOTS }, (_, slot) => {
    const p = v.spinPhotos.find((s) => s.slot === slot);
    return p ? photoUrls(storage, p) : null;
  });
  return { ...toPublicVan(storage, v), status: v.status, ownerId: v.ownerId, updatedAt: v.updatedAt, spinEnabled: v.spinEnabled, spinSlots: slots, contract: contractTermsOf(v) };
}

/**
 * The /kombiji search. Plain filters run in the database; availability and
 * the exact price for the chosen dates are worked out per van, then sorted
 * and paged.
 */
export async function searchVans(db: Executor, storage: PhotoStorage, q: VanSearch): Promise<SearchResult> {
  const dailyRate = sql<number>`(${vans.pricing}->>'dailyRate')::int`;
  // A price filter leaves out vans whose price is by agreement.
  const priced = sql`coalesce((${vans.pricing}->>'priceOnRequest')::boolean, false) = false`;
  // Every word must appear in the name, city or description (any case).
  const words = (q.q ?? "").toLowerCase().split(/\s+/).filter(Boolean).slice(0, 8);
  const text = words.map((w) => {
    const like = `%${w.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    return sql`(${vans.name} ilike ${like} or ${vans.location} ilike ${like} or ${vans.description} ilike ${like})`;
  });
  const where = and(
    isPublic,
    ...text,
    q.type ? eq(vans.category, q.type) : undefined,
    q.seats ? gte(vans.seats, q.seats) : undefined,
    q.luggage ? gte(vans.luggage, q.luggage) : undefined,
    q.gearbox ? eq(vans.gearbox, q.gearbox) : undefined,
    q.fuel ? eq(vans.fuel, q.fuel) : undefined,
    q.city ? sql`lower(${vans.location}) = lower(${q.city})` : undefined,
    q.yearMin ? gte(vans.year, q.yearMin) : undefined,
    q.features?.length ? sql`${vans.features} @> ${JSON.stringify(q.features)}::jsonb` : undefined,
    q.priceMin !== undefined ? and(priced, sql`${dailyRate} >= ${q.priceMin}`) : undefined,
    q.priceMax !== undefined ? and(priced, sql`${dailyRate} <= ${q.priceMax}`) : undefined,
  );
  const [rows, cityRows] = await Promise.all([
    db.select({ van: vans }).from(vans).leftJoin(users, eq(users.id, vans.ownerId)).where(where),
    db
      .selectDistinct({ city: vans.location })
      .from(vans)
      .leftJoin(users, eq(users.id, vans.ownerId))
      .where(isPublic)
      .orderBy(asc(vans.location)),
  ]);

  type Card = ReturnType<typeof toCard>;
  const bookable = (c: Card) => c.available !== false && !c.quote?.errors.length;
  const ratings = await ratingsOf(db, rows.map(({ van }) => van.id));
  let cards: Card[] = rows.map(({ van }) => ({ ...toCard(storage, van), rating: ratings.get(van.id) }));
  let free = cards.length;
  if (q.start && q.end) {
    const dates = { start: q.start, end: q.end };
    const busy = await busyVans(db, cards.map((c) => c.id), q.start, q.end);
    cards = rows.map(({ van }, i) => {
      const qt = quote(dates, pricingOf(van));
      return { ...cards[i]!, available: !busy.has(van.id), quote: { days: qt.days, total: qt.total, errors: qt.errors } };
    });
    free = cards.filter(bookable).length;
    if (!q.taken) cards = cards.filter(bookable);
  }

  // Vans priced by agreement have no price to compare: they come after the priced ones.
  const daily = (c: Card) => (c.priceOnRequest ? Infinity : c.dailyRate);
  const price = (c: Card) => (c.priceOnRequest ? Infinity : (c.quote?.total ?? c.dailyRate));
  const cmp = (a: number, b: number) => (a === b ? 0 : a - b);
  const by: Record<NonNullable<VanSearch["sort"]>, (a: Card, b: Card) => number> = {
    total: (a, b) => cmp(price(a), price(b)),
    daily: (a, b) => cmp(daily(a), daily(b)),
    seats: (a, b) => b.seats - a.seats || cmp(daily(a), daily(b)),
    newest: (a, b) => b.year - a.year || cmp(daily(a), daily(b)),
  };
  const sort = by[q.sort ?? "total"];
  // When taken vans are shown too, free ones come first.
  cards.sort((a, b) => Number(bookable(b)) - Number(bookable(a)) || sort(a, b) || a.name.localeCompare(b.name));

  const page = q.page ?? 1;
  return {
    items: cards.slice((page - 1) * SEARCH_PAGE_SIZE, page * SEARCH_PAGE_SIZE),
    total: cards.length,
    free,
    page,
    pageSize: SEARCH_PAGE_SIZE,
    cities: cityRows.map((r) => r.city),
  };
}
