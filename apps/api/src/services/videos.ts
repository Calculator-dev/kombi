import { randomUUID } from "node:crypto";
import { Transform, type Readable } from "node:stream";
import type { Request } from "express";
import { and, eq, inArray, lt, sql } from "drizzle-orm";
import {
  KEEP_HANDOVER_DAYS,
  MAX_VIDEO_BYTES,
  VIDEO_TYPES,
  type HandoverSide,
  type HandoverStage,
  type HandoverVideo,
  type VideoUrl,
} from "@kombi/shared";
import { schema, type Executor } from "../db";
import type { StoredVideo, VanRow } from "../db/schema";
import { HttpError } from "../errors";
import type { PhotoStorage } from "./storage";

const { bookings, handoverVideos, vans } = schema;
const EXT: Record<string, string> = { "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" };

/**
 * A video sent as the raw request body (Content-Type video/…, Content-Length set),
 * checked before anything is stored. The stream stops if more arrives than announced.
 */
export function incomingVideo(req: Request): { body: Readable; length: number; contentType: string; ext: string } {
  const contentType = (req.headers["content-type"] ?? "").split(";")[0]!.trim().toLowerCase();
  if (!(VIDEO_TYPES as readonly string[]).includes(contentType)) {
    throw new HttpError(415, "invalid_video", "Podržani su MP4, MOV i WebM videi.");
  }
  const length = Number(req.headers["content-length"]);
  if (!Number.isInteger(length) || length <= 0) throw new HttpError(411, "length_required", "Video nije poslan kako treba. Pokušajte ponovo.");
  if (length > MAX_VIDEO_BYTES) {
    throw new HttpError(413, "video_too_large", `Video je prevelik (najviše ${MAX_VIDEO_BYTES / 1024 / 1024} MB). Snimite kraći ili u manjoj rezoluciji.`);
  }
  let seen = 0;
  const guard = new Transform({
    transform(chunk: Buffer, _enc, done) {
      seen += chunk.length;
      done(seen > length ? new HttpError(400, "invalid_video", "Video je veći nego što je najavljeno.") : null, chunk);
    },
  });
  req.on("error", (e) => guard.destroy(e));
  return { body: req.pipe(guard), length, contentType, ext: EXT[contentType]! };
}

export const videoUrl = (storage: PhotoStorage, v: StoredVideo): VideoUrl => ({ url: storage.url(v.key), contentType: v.contentType });

/** Puts (or replaces) the van's walk-around video. */
export async function setSpinVideo(db: Executor, storage: PhotoStorage, van: VanRow, req: Request): Promise<VanRow> {
  const v = incomingVideo(req);
  const video: StoredVideo = { key: `vans/${van.id}/video-${randomUUID()}.${v.ext}`, contentType: v.contentType, size: v.length };
  await storage.putStream(video.key, v.body, v.length, v.contentType);
  const [row] = await db.update(vans).set({ spinVideo: video, updatedAt: sql`now()` }).where(eq(vans.id, van.id)).returning();
  if (van.spinVideo) await storage.remove([van.spinVideo.key]).catch((e) => console.error("[storage]", e));
  return row!;
}

export async function removeSpinVideo(db: Executor, storage: PhotoStorage, van: VanRow): Promise<VanRow> {
  const [row] = await db.update(vans).set({ spinVideo: null, updatedAt: sql`now()` }).where(eq(vans.id, van.id)).returning();
  if (van.spinVideo) await storage.remove([van.spinVideo.key]).catch((e) => console.error("[storage]", e));
  return row!;
}

/** Puts (or replaces) the video of one side of the vehicle, at pickup or return. */
export async function setHandoverVideo(
  db: Executor,
  storage: PhotoStorage,
  bookingId: string,
  stage: HandoverStage,
  side: HandoverSide,
  req: Request,
): Promise<void> {
  const v = incomingVideo(req);
  const key = `handover/${bookingId}/${stage}-${side}-${randomUUID()}.${v.ext}`;
  await storage.putStream(key, v.body, v.length, v.contentType);
  const [old] = await db
    .select()
    .from(handoverVideos)
    .where(and(eq(handoverVideos.bookingId, bookingId), eq(handoverVideos.stage, stage), eq(handoverVideos.side, side)));
  await db
    .insert(handoverVideos)
    .values({ bookingId, stage, side, key, contentType: v.contentType, size: v.length })
    .onConflictDoUpdate({
      target: [handoverVideos.bookingId, handoverVideos.stage, handoverVideos.side],
      set: { key, contentType: v.contentType, size: v.length, createdAt: sql`now()` },
    });
  if (old) await storage.remove([old.key]).catch((e) => console.error("[storage]", e));
}

export async function removeHandoverVideo(db: Executor, storage: PhotoStorage, bookingId: string, stage: HandoverStage, side: HandoverSide) {
  const rows = await db
    .delete(handoverVideos)
    .where(and(eq(handoverVideos.bookingId, bookingId), eq(handoverVideos.stage, stage), eq(handoverVideos.side, side)))
    .returning();
  if (rows.length) await storage.remove(rows.map((r) => r.key)).catch((e) => console.error("[storage]", e));
}

/** The handover videos of these bookings, by booking. */
export async function handoverOf(db: Executor, storage: PhotoStorage, bookingIds: string[]): Promise<Map<string, HandoverVideo[]>> {
  const out = new Map<string, HandoverVideo[]>();
  if (!bookingIds.length) return out;
  const rows = await db.select().from(handoverVideos).where(inArray(handoverVideos.bookingId, bookingIds));
  for (const r of rows) {
    const v: HandoverVideo = { id: r.id, stage: r.stage, side: r.side, url: storage.url(r.key), contentType: r.contentType, createdAt: r.createdAt.toISOString() };
    out.set(r.bookingId, [...(out.get(r.bookingId) ?? []), v]);
  }
  return out;
}

/** Deletes handover videos KEEP_HANDOVER_DAYS after the return. */
export async function purgeHandover(db: Executor, storage: PhotoStorage, today: string): Promise<number> {
  const rows = await db
    .select({ id: handoverVideos.id, key: handoverVideos.key })
    .from(handoverVideos)
    .innerJoin(bookings, eq(bookings.id, handoverVideos.bookingId))
    .where(lt(bookings.end, sql`${today}::date - ${KEEP_HANDOVER_DAYS}::int`));
  if (!rows.length) return 0;
  await storage.remove(rows.map((r) => r.key));
  await db.delete(handoverVideos).where(inArray(handoverVideos.id, rows.map((r) => r.id)));
  return rows.length;
}
