import "server-only";
import { DEFAULT_SETTINGS, settingsSchema, upgradeSettings, type Settings } from "@kombi/shared";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

/** Prices come from the API (admin-editable); defaults keep the site up if it's unreachable. */
export async function getSettings(): Promise<Settings> {
  try {
    // Short timeout: during a build the API may be asleep or not deployed yet.
    const res = await fetch(`${API_URL}/api/settings`, { next: { revalidate: 60 }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(String(res.status));
    return settingsSchema.parse(upgradeSettings(await res.json()));
  } catch {
    return DEFAULT_SETTINGS;
  }
}
