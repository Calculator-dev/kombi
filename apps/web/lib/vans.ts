import "server-only";
import { DEFAULT_TERMS, SEARCH_PAGE_SIZE, type PublicVan, type SearchResult, type VanCard } from "@kombi/shared";

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
  // An older API (e.g. mid-deploy) may not send the newer fields yet.
  return ((await get<VanCard[]>("/vans")) ?? []).map((v) => ({ ...v, luggage: v.luggage ?? 0, powerHp: v.powerHp ?? 0, features: v.features ?? [] }));
}

export async function getVan(slug: string): Promise<PublicVan | null> {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  const van = await get<PublicVan>(`/vans/${slug}`);
  // An older API (e.g. mid-deploy) may not send terms yet.
  return (
    van && {
      ...van,
      luggage: van.luggage ?? 0,
      powerHp: van.powerHp ?? 0,
      features: van.features ?? [],
      terms: { ...DEFAULT_TERMS, ...van.terms },
    }
  );
}

/** First page of a /kombiji search, rendered on the server. */
export async function searchVans(query: string): Promise<SearchResult> {
  try {
    const res = await fetch(`${API_URL}/api/search?${query}`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(String(res.status));
    return (await res.json()) as SearchResult;
  } catch {
    return { items: [], total: 0, free: 0, page: 1, pageSize: SEARCH_PAGE_SIZE, cities: [] };
  }
}
