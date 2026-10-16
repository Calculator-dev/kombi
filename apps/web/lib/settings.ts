import "server-only";
import { DEFAULT_SETTINGS, settingsSchema, type Settings } from "@kombi/shared";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

/** Prices come from the API (admin-editable); defaults keep the site up if it's unreachable. */
export async function getSettings(): Promise<Settings> {
  try {
    const res = await fetch(`${API_URL}/api/settings`, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error(String(res.status));
    return settingsSchema.parse(await res.json());
  } catch {
    return DEFAULT_SETTINGS;
  }
}
