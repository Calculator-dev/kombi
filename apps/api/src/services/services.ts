import { and, desc, eq } from "drizzle-orm";
import type { VanService, VanServiceInput } from "@kombi/shared";
import { schema, type Executor } from "../db";
import { HttpError } from "../errors";

const { vanServices } = schema;

/** A van's service history, newest first. */
export async function servicesOf(db: Executor, vanId: string): Promise<VanService[]> {
  const rows = await db.select().from(vanServices).where(eq(vanServices.vanId, vanId)).orderBy(desc(vanServices.date), desc(vanServices.createdAt));
  return rows.map((r) => ({ id: r.id, date: r.date, title: r.title, km: r.km, work: r.work }));
}

export async function addService(db: Executor, vanId: string, s: VanServiceInput): Promise<void> {
  await db.insert(vanServices).values({ vanId, ...s });
}

export async function updateService(db: Executor, vanId: string, id: string, s: VanServiceInput): Promise<void> {
  const rows = await db.update(vanServices).set(s).where(and(eq(vanServices.id, id), eq(vanServices.vanId, vanId))).returning();
  if (!rows.length) throw new HttpError(404, "not_found", "Servis ne postoji.");
}

export async function removeService(db: Executor, vanId: string, id: string): Promise<void> {
  await db.delete(vanServices).where(and(eq(vanServices.id, id), eq(vanServices.vanId, vanId)));
}
