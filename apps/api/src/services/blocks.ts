import { and, asc, eq, gte, sql } from "drizzle-orm";
import { schema, type Executor } from "../db";
import type { UserRow } from "../db/schema";

const { blockedRanges, vans } = schema;

export interface Block {
  id: string;
  vanId: string;
  start: string;
  end: string;
  reason: string | null;
}

const columns = {
  id: blockedRanges.id,
  vanId: blockedRanges.vanId,
  start: blockedRanges.start,
  end: blockedRanges.end,
  reason: blockedRanges.reason,
};

/** Blocks on the user's vans that are current or ended in the last 30 days. */
export async function listBlocks(db: Executor, user: UserRow): Promise<Block[]> {
  return db
    .select(columns)
    .from(blockedRanges)
    .innerJoin(vans, eq(vans.id, blockedRanges.vanId))
    .where(and(gte(blockedRanges.end, sql`current_date - 30`), user.role === "admin" ? undefined : eq(vans.ownerId, user.id)))
    .orderBy(asc(blockedRanges.start));
}

/** The caller checks that the user may manage `vanId`. */
export async function createBlock(db: Executor, b: Omit<Block, "id">): Promise<Block> {
  const [row] = await db.insert(blockedRanges).values(b).returning(columns);
  return row!;
}

export async function deleteBlock(db: Executor, user: UserRow, id: string): Promise<boolean> {
  const owned =
    user.role === "admin"
      ? undefined
      : sql`${blockedRanges.vanId} in (select ${vans.id} from ${vans} where ${vans.ownerId} = ${user.id})`;
  const rows = await db
    .delete(blockedRanges)
    .where(and(eq(blockedRanges.id, id), owned))
    .returning({ id: blockedRanges.id });
  return rows.length > 0;
}
