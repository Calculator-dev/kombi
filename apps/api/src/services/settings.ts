import { eq, sql } from "drizzle-orm";
import { DEFAULT_SETTINGS, settingsSchema, type Settings } from "@kombi/shared";
import { schema, type Executor } from "../db";

const { settings } = schema;

export async function getSettings(db: Executor): Promise<Settings> {
  const [row] = await db.select({ data: settings.data }).from(settings).where(eq(settings.id, 1));
  if (!row) {
    await db.insert(settings).values({ id: 1, data: DEFAULT_SETTINGS }).onConflictDoNothing();
    return structuredClone(DEFAULT_SETTINGS);
  }
  // Merge with defaults so settings added in later versions get a value.
  const parsed = settingsSchema.safeParse({ ...DEFAULT_SETTINGS, ...row.data });
  return parsed.success ? parsed.data : structuredClone(DEFAULT_SETTINGS);
}

export async function saveSettings(db: Executor, input: unknown): Promise<Settings> {
  const data = settingsSchema.parse(input);
  await db
    .insert(settings)
    .values({ id: 1, data })
    .onConflictDoUpdate({ target: settings.id, set: { data, updatedAt: sql`now()` } });
  return data;
}
