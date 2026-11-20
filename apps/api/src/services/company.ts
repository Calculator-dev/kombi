import { randomUUID } from "node:crypto";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import sharp from "sharp";
import { slugify, type CompanyPage } from "@kombi/shared";
import { schema, type Executor } from "../db";
import type { UserRow } from "../db/schema";
import { HttpError } from "../errors";
import { ratingsOf } from "./reviews";
import type { PhotoStorage } from "./storage";
import { brandCounts, logoUrl, toCard } from "./vans";

const { users, vans } = schema;

/** The owner's company page address, made from their name the first time it is needed. */
export async function ensureSlug(db: Executor, user: Pick<UserRow, "id" | "slug" | "name" | "email">): Promise<string> {
  if (user.slug) return user.slug;
  const base = slugify(user.name?.trim() || user.email.split("@")[0]!).slice(0, 50) || "firma";
  for (let n = 1; n < 100; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const [taken] = await db.select({ id: users.id }).from(users).where(and(eq(users.slug, slug), ne(users.id, user.id)));
    if (taken) continue;
    // Only if still unset: a parallel request may have just given it one.
    const [row] = await db.update(users).set({ slug }).where(and(eq(users.id, user.id), sql`${users.slug} is null`)).returning({ slug: users.slug });
    if (row?.slug) return row.slug;
    const [now] = await db.select({ slug: users.slug }).from(users).where(eq(users.id, user.id));
    if (now?.slug) return now.slug;
  }
  throw new HttpError(500, "slug", "Adresa stranice firme se ne može napraviti.");
}

/** A square logo on a transparent background, WebP, at most 400 px. */
export async function setLogo(db: Executor, storage: PhotoStorage, user: UserRow, input: Buffer): Promise<UserRow> {
  let webp: Buffer;
  try {
    webp = await sharp(input, { limitInputPixels: 50_000_000, failOn: "error" })
      .rotate()
      .resize({ width: 400, height: 400, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 }, withoutEnlargement: false })
      .webp({ quality: 90 })
      .toBuffer();
  } catch {
    throw new HttpError(400, "invalid_image", "Logo mora biti slika (JPG, PNG ili WebP).");
  }
  const key = `logos/${user.id}/${randomUUID()}.webp`;
  await storage.put(key, webp, "image/webp");
  const [row] = await db.update(users).set({ logo: { key }, updatedAt: sql`now()` }).where(eq(users.id, user.id)).returning();
  if (user.logo) await storage.remove([user.logo.key]).catch((e) => console.error("[storage]", e));
  return row!;
}

export async function removeLogo(db: Executor, storage: PhotoStorage, user: UserRow): Promise<UserRow> {
  const [row] = await db.update(users).set({ logo: null, updatedAt: sql`now()` }).where(eq(users.id, user.id)).returning();
  if (user.logo) await storage.remove([user.logo.key]).catch((e) => console.error("[storage]", e));
  return row!;
}

/** The public page of an approved owner: logo, makes and published vehicles. */
export async function companyPage(db: Executor, storage: PhotoStorage, slug: string): Promise<CompanyPage | null> {
  const [owner] = await db.select().from(users).where(and(eq(users.slug, slug), eq(users.status, "approved")));
  if (!owner) return null;
  const list = await db.select().from(vans).where(and(eq(vans.ownerId, owner.id), eq(vans.status, "published"))).orderBy(asc(vans.createdAt));
  const ratings = await ratingsOf(db, list.map((v) => v.id));
  const logo = logoUrl(storage, owner.logo);
  const cities = new Map<string, number>();
  for (const v of list) cities.set(v.location, (cities.get(v.location) ?? 0) + 1);
  return {
    slug,
    name: owner.name?.trim() || "Iznajmljivač",
    logo,
    location: [...cities].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    brands: brandCounts(list),
    vans: list.map((v) => ({ ...toCard(storage, v), rating: ratings.get(v.id), ownerLogo: logo })),
  };
}
