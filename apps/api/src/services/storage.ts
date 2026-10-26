import { randomUUID } from "node:crypto";
import { DeleteObjectsCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import sharp from "sharp";
import type { Config } from "../config";
import type { StoredPhoto } from "../db/schema";
import { HttpError } from "../errors";

export interface PhotoStorage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  remove(keys: string[]): Promise<void>;
  url(key: string): string;
}

/** Backblaze B2 through its S3-compatible API. */
export function backblazeStorage(config: Config): PhotoStorage {
  const bucket = config.BACKBLAZE_BUCKET_NAME!;
  const client = new S3Client({
    endpoint: config.BACKBLAZE_ENDPOINT,
    region: config.BACKBLAZE_REGION ?? "us-east-1",
    credentials: { accessKeyId: config.BACKBLAZE_KEY_ID!, secretAccessKey: config.BACKBLAZE_APP_KEY! },
  });
  const host = new URL(config.BACKBLAZE_ENDPOINT!).host; // s3.<region>.backblazeb2.com
  const base = (config.BACKBLAZE_PUBLIC_URL ?? `https://${bucket}.${host}`).replace(/\/$/, "");
  return {
    async put(key, body, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          // Keys are unique per upload, so browsers and CDNs may keep them forever.
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );
    },
    async remove(keys) {
      if (!keys.length) return;
      await client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys.map((Key) => ({ Key })) } }));
    },
    url: (key) => `${base}/${key}`,
  };
}

/** Keeps photos in memory; for development without Backblaze, and for tests. */
export function memoryStorage(): PhotoStorage & { files: Map<string, Buffer> } {
  const files = new Map<string, Buffer>();
  return {
    files,
    async put(key, body) {
      files.set(key, body);
    },
    async remove(keys) {
      for (const k of keys) files.delete(k);
    },
    // Served by the API itself (see app.ts), through the website's /api proxy.
    url: (key) => `/api/dev-photos/${key}`,
  };
}

export function createStorage(config: Config): PhotoStorage {
  if (config.BACKBLAZE_ENDPOINT && config.BACKBLAZE_KEY_ID && config.BACKBLAZE_APP_KEY && config.BACKBLAZE_BUCKET_NAME) {
    return backblazeStorage(config);
  }
  if (config.NODE_ENV !== "test") console.warn("[storage] Backblaze is not configured — photos are kept in memory only.");
  return memoryStorage();
}

/**
 * Turns an upload into a large photo and a thumbnail (WebP), stores both and
 * returns their keys. Photos are rotated upright, and sharp drops all metadata
 * by default, so GPS location and camera details from phones are not published.
 */
export async function storePhoto(storage: PhotoStorage, vanId: string, input: Buffer): Promise<StoredPhoto> {
  const image = sharp(input, { limitInputPixels: 50_000_000, failOn: "error" }).rotate();
  let meta;
  try {
    meta = await image.metadata();
  } catch {
    throw new HttpError(400, "invalid_image", "Datoteka nije slika ili je oštećena.");
  }
  if (!meta.format || !["jpeg", "png", "webp", "avif"].includes(meta.format)) {
    throw new HttpError(400, "invalid_image", "Podržane su JPG, PNG i WebP slike.");
  }
  let large, thumb;
  try {
    [large, thumb] = await Promise.all([
      image.clone().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true }),
      image.clone().resize({ width: 640, height: 480, fit: "cover" }).webp({ quality: 75 }).toBuffer(),
    ]);
  } catch {
    throw new HttpError(400, "invalid_image", "Slika se ne može obraditi. Pokušajte s JPG datotekom.");
  }
  const id = randomUUID();
  const photo: StoredPhoto = {
    id,
    key: `vans/${vanId}/${id}.webp`,
    thumbKey: `vans/${vanId}/${id}-thumb.webp`,
    width: large.info.width,
    height: large.info.height,
  };
  await Promise.all([
    storage.put(photo.key, large.data, "image/webp"),
    storage.put(photo.thumbKey, thumb, "image/webp"),
  ]);
  return photo;
}
