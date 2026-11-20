import { createCipheriv, createDecipheriv, hkdfSync, randomBytes, randomUUID } from "node:crypto";
import { and, eq, inArray, lt, or, sql } from "drizzle-orm";
import sharp from "sharp";
import {
  DOCUMENT_LABELS,
  KEEP_DOCUMENTS_DAYS,
  NO_DOCUMENTS,
  missingDocuments,
  type DocumentKind,
  type DocumentRules,
} from "@kombi/shared";
import type { Config } from "../config";
import { schema, type Executor } from "../db";
import type { BookingDocumentRow } from "../db/schema";
import { HttpError } from "../errors";
import type { PhotoStorage } from "./storage";

const { bookings, bookingDocuments, users } = schema;

/** A file as multer hands it over. */
export interface Upload {
  kind: DocumentKind;
  buffer: Buffer;
}

/**
 * The key photos of documents are encrypted with (AES-256-GCM). Derived from
 * DOCUMENTS_KEY, so any long random string works there; without it (development,
 * or a server not set up yet) from the storage key, so files are never stored in the clear.
 */
export function documentsKey(config: Pick<Config, "DOCUMENTS_KEY" | "BACKBLAZE_APP_KEY">): Buffer {
  const secret = config.DOCUMENTS_KEY ?? config.BACKBLAZE_APP_KEY ?? "kombi.ba local development only";
  return Buffer.from(hkdfSync("sha256", secret, "kombi.ba", "booking documents v1", 32));
}

/** iv (12 bytes) + auth tag (16 bytes) + ciphertext. */
export function encrypt(key: Buffer, plain: Buffer): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]);
}

export function decrypt(key: Buffer, blob: Buffer): Buffer {
  const decipher = createDecipheriv("aes-256-gcm", key, blob.subarray(0, 12));
  decipher.setAuthTag(blob.subarray(12, 28));
  return Buffer.concat([decipher.update(blob.subarray(28)), decipher.final()]);
}

/**
 * A photo of a document as a JPEG, upright and at most 2000 px. Re-encoding drops
 * everything but the picture (location, camera details) and anything hidden in the file.
 */
async function toJpeg(input: Buffer): Promise<Buffer> {
  const image = sharp(input, { limitInputPixels: 50_000_000, failOn: "error" }).rotate();
  let format: string | undefined;
  try {
    format = (await image.metadata()).format;
  } catch {
    throw new HttpError(400, "invalid_document", "Dokument mora biti fotografija (JPG, PNG ili WebP).");
  }
  if (!format || !["jpeg", "png", "webp"].includes(format)) {
    throw new HttpError(400, "invalid_document", "Dokument mora biti fotografija (JPG, PNG ili WebP).");
  }
  try {
    return await image.resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
  } catch {
    throw new HttpError(400, "invalid_document", "Fotografija dokumenta se ne može obraditi. Pokušajte s drugom.");
  }
}

/** What the owner of a van asks for; nothing for vans without an owner. */
export async function documentRulesFor(db: Executor, ownerId: string | null): Promise<DocumentRules> {
  if (!ownerId) return NO_DOCUMENTS;
  const [row] = await db.select({ rules: users.documentRules }).from(users).where(eq(users.id, ownerId));
  return row?.rules ?? NO_DOCUMENTS;
}

/** Throws before anything is saved when a required document is missing or one isn't asked for. */
export function checkUploads(rules: DocumentRules, uploads: Upload[]): void {
  const extra = uploads.find((u) => rules[u.kind] === "off");
  if (extra) throw new HttpError(400, "invalid_document", `${DOCUMENT_LABELS[extra.kind]} se ne traži za ovo vozilo.`);
  const count = Object.fromEntries(uploads.map((u) => [u.kind, uploads.filter((x) => x.kind === u.kind).length]));
  const missing = missingDocuments(rules, count);
  if (missing.length) {
    throw new HttpError(400, "documents_required", `Vlasnik traži fotografiju: ${missing.map((k) => DOCUMENT_LABELS[k].toLowerCase()).join(" i ")}.`, {
      ...Object.fromEntries(missing.map((k) => [`doc_${k}`, "Obavezno"])),
    });
  }
}

/** Converts every photo first (so a bad file fails the request), then encrypts and stores them. */
export async function prepareUploads(uploads: Upload[]): Promise<{ kind: DocumentKind; jpeg: Buffer }[]> {
  return Promise.all(uploads.map(async (u) => ({ kind: u.kind, jpeg: await toJpeg(u.buffer) })));
}

export async function saveDocuments(
  db: Executor,
  storage: PhotoStorage,
  key: Buffer,
  bookingId: string,
  files: { kind: DocumentKind; jpeg: Buffer }[],
): Promise<void> {
  if (!files.length) return;
  const rows = files.map((f) => ({ id: randomUUID(), kind: f.kind, key: `documents/${bookingId}/${randomUUID()}.bin`, jpeg: f.jpeg }));
  await Promise.all(rows.map((r) => storage.put(r.key, encrypt(key, r.jpeg), "application/octet-stream", { private: true })));
  await db.insert(bookingDocuments).values(rows.map(({ id, kind, key: k }) => ({ id, bookingId, kind, key: k })));
}

/** The documents of these bookings, by booking. */
export async function documentsOf(db: Executor, bookingIds: string[]): Promise<Map<string, { id: string; kind: DocumentKind }[]>> {
  const out = new Map<string, { id: string; kind: DocumentKind }[]>();
  if (!bookingIds.length) return out;
  const rows = await db
    .select({ id: bookingDocuments.id, kind: bookingDocuments.kind, bookingId: bookingDocuments.bookingId })
    .from(bookingDocuments)
    .where(inArray(bookingDocuments.bookingId, bookingIds))
    .orderBy(bookingDocuments.kind, bookingDocuments.createdAt);
  for (const r of rows) out.set(r.bookingId, [...(out.get(r.bookingId) ?? []), { id: r.id, kind: r.kind }]);
  return out;
}

/** One document of a booking the caller may see (checked by the caller), decrypted. */
export async function readDocument(db: Executor, storage: PhotoStorage, key: Buffer, bookingId: string, id: string): Promise<Buffer> {
  const [row] = await db
    .select()
    .from(bookingDocuments)
    .where(and(eq(bookingDocuments.id, id), eq(bookingDocuments.bookingId, bookingId)));
  const blob = row ? await storage.get(row.key) : null;
  if (!blob) throw new HttpError(404, "not_found", "Dokument više ne postoji.");
  return decrypt(key, blob);
}

async function remove(db: Executor, storage: PhotoStorage, rows: BookingDocumentRow[]): Promise<number> {
  if (!rows.length) return 0;
  await storage.remove(rows.map((r) => r.key));
  await db.delete(bookingDocuments).where(inArray(bookingDocuments.id, rows.map((r) => r.id)));
  return rows.length;
}

/** Deletes the documents of one booking, e.g. when it is declined or cancelled. */
export async function deleteDocumentsOf(db: Executor, storage: PhotoStorage, bookingId: string): Promise<number> {
  return remove(db, storage, await db.select().from(bookingDocuments).where(eq(bookingDocuments.bookingId, bookingId)));
}

/**
 * Deletes documents that are no longer needed: of rentals that ended more than
 * KEEP_DOCUMENTS_DAYS ago, and of requests that were declined or cancelled.
 */
export async function purgeDocuments(db: Executor, storage: PhotoStorage, today: string): Promise<number> {
  const rows = await db
    .select({ d: bookingDocuments })
    .from(bookingDocuments)
    .innerJoin(bookings, eq(bookings.id, bookingDocuments.bookingId))
    .where(
      or(
        inArray(bookings.status, ["declined", "cancelled"]),
        lt(bookings.end, sql`${today}::date - ${KEEP_DOCUMENTS_DAYS}::int`),
      ),
    );
  return remove(db, storage, rows.map((r) => r.d));
}
