/** Small fetch wrapper for the browser. Calls go to /api/* on the same origin. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown; token?: string } = {}): Promise<T> {
  const { json, token, ...rest } = init;
  const res = await fetch(`/api${path}`, {
    ...rest,
    headers: {
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...rest.headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    credentials: "same-origin",
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      res.status,
      data.error ?? "error",
      data.message ?? "Nešto nije u redu. Pokušajte ponovo.",
      data.fields ?? {},
    );
  }
  return data as T;
}

/** A file from the admin API (e.g. a photo of a customer's document), as the logged-in user. */
export async function adminBlob(path: string): Promise<Blob> {
  const { supabase } = await import("./supabase");
  const { data } = await supabase().auth.getSession();
  if (!data.session) throw new ApiError(401, "unauthorized", "Prijavite se ponovo.");
  const res = await fetch(`/api/admin${path}`, { headers: { Authorization: `Bearer ${data.session.access_token}` }, cache: "no-store" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? "error", body.message ?? "Dokument se ne može otvoriti.");
  }
  return res.blob();
}

/** Calls the admin API as the logged-in Supabase user. */
export async function adminApi<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { supabase } = await import("./supabase");
  const { data } = await supabase().auth.getSession();
  if (!data.session) throw new ApiError(401, "unauthorized", "Prijavite se ponovo.");
  return api<T>(`/admin${path}`, { ...init, token: data.session.access_token });
}
