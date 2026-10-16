import { asc, eq, gte, sql } from "drizzle-orm";
import { schema, type Executor } from "../db";

const { blockedRanges } = schema;

export interface Block {
  id: string;
  start: string;
  end: string;
  reason: string | null;
}

const columns = { id: blockedRanges.id, start: blockedRanges.start, end: blockedRanges.end, reason: blockedRanges.reason };

/** Blocks that are current or ended in the last 30 days. */
export async function listBlocks(db: Executor): Promise<Block[]> {
  return db
    .select(columns)
    .from(blockedRanges)
    .where(gte(blockedRanges.end, sql`current_date - 30`))
    .orderBy(asc(blockedRanges.start));
}

export async function createBlock(db: Executor, b: Omit<Block, "id">): Promise<Block> {
  const [row] = await db.insert(blockedRanges).values(b).returning(columns);
  return row!;
}

export async function deleteBlock(db: Executor, id: string): Promise<boolean> {
  const rows = await db.delete(blockedRanges).where(eq(blockedRanges.id, id)).returning({ id: blockedRanges.id });
  return rows.length > 0;
}
