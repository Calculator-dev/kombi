import { asc, eq, sql } from "drizzle-orm";
import { PLAN_INFO, planVans, type Plan, type Profile, type UserStatus } from "@kombi/shared";
import { schema, type Executor } from "../db";
import type { UserRow } from "../db/schema";
import { HttpError } from "../errors";
import { publishedCount } from "./vans";

const { users } = schema;

/**
 * Finds the user for a verified login, creating them on first visit. Emails on
 * the platform-admin list become (approved) admins; everyone else starts as a
 * pending owner until an admin approves them.
 */
export async function ensureUser(
  db: Executor,
  claims: { id: string; email: string },
  adminEmails: string[],
): Promise<UserRow> {
  const email = claims.email.toLowerCase();
  const isAdmin = adminEmails.includes(email);
  const [existing] = await db.select().from(users).where(eq(users.id, claims.id));
  if (existing) {
    if (isAdmin && existing.role !== "admin") {
      const [row] = await db
        .update(users)
        .set({ role: "admin", status: "approved", updatedAt: sql`now()` })
        .where(eq(users.id, claims.id))
        .returning();
      return row!;
    }
    return existing;
  }
  const [row] = await db
    .insert(users)
    .values({ id: claims.id, email, role: isAdmin ? "admin" : "owner", status: isAdmin ? "approved" : "pending" })
    .onConflictDoNothing()
    .returning();
  if (row) return row;
  // Created by a parallel request a moment ago.
  const [again] = await db.select().from(users).where(eq(users.id, claims.id));
  if (!again) throw new HttpError(409, "email_taken", "Ovaj email već koristi drugi račun.");
  return again;
}

export async function updateProfile(db: Executor, id: string, p: Profile): Promise<UserRow> {
  const [row] = await db
    .update(users)
    .set({ name: p.name, phone: p.phone, address: p.address, companyId: p.companyId, representative: p.representative, updatedAt: sql`now()` })
    .where(eq(users.id, id))
    .returning();
  return row!;
}

export async function listUsers(db: Executor): Promise<UserRow[]> {
  return db.select().from(users).orderBy(sql`case ${users.status} when 'pending' then 0 else 1 end`, asc(users.createdAt));
}

export async function getUser(db: Executor, id: string): Promise<UserRow | null> {
  const [row] = await db.select().from(users).where(eq(users.id, id));
  return row ?? null;
}

export async function setUserStatus(db: Executor, id: string, status: UserStatus): Promise<UserRow> {
  const [row] = await db
    .update(users)
    .set({ status, updatedAt: sql`now()` })
    .where(eq(users.id, id))
    .returning();
  if (!row) throw new HttpError(404, "not_found", "Korisnik ne postoji.");
  return row;
}

/** Changes an owner's package. A smaller one is refused while more vans are published than it allows. */
export async function setUserPlan(db: Executor, id: string, plan: Plan): Promise<UserRow> {
  const max = PLAN_INFO[plan].maxVans;
  if (max !== null) {
    const live = await publishedCount(db, id);
    if (live > max) {
      throw new HttpError(
        409,
        "plan_too_small",
        `Vlasnik ima ${live} objavljenih kombija, a paket ${PLAN_INFO[plan].label} dozvoljava ${planVans(plan)}. Prvo sakrijte višak.`,
      );
    }
  }
  const [row] = await db.update(users).set({ plan, updatedAt: sql`now()` }).where(eq(users.id, id)).returning();
  if (!row) throw new HttpError(404, "not_found", "Korisnik ne postoji.");
  return row;
}

/** Analytics come with every paid package; admins always have them. */
export const hasAnalytics = (u: UserRow) => u.role === "admin" || PLAN_INFO[u.plan].analytics;
