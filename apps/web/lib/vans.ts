import "server-only";
import { DEFAULT_TERMS, type PublicVan, type VanCard } from "@kombi/shared";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

async function get<T>(path: string): Promise<T | null> {
  try {
    // Short timeout: during a build the API may be asleep or not deployed yet.
    const res = await fetch(`${API_URL}/api${path}`, { next: { revalidate: 60 }, signal: AbortSignal.timeout(5000) });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(String(res.status));
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Vans on offer; empty if the API can't be reached (pages refresh within a minute). */
export async function getVans(): Promise<VanCard[]> {
  return (await get<VanCard[]>("/vans")) ?? [];
}

export async function getVan(slug: string): Promise<PublicVan | null> {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  const van = await get<PublicVan>(`/vans/${slug}`);
  // An older API (e.g. mid-deploy) may not send terms yet.
  return van && { ...van, terms: { ...DEFAULT_TERMS, ...van.terms } };
}
