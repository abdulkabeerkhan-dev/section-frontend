// Thin client for our FastAPI backend. Every call carries the active Clerk
// session token so the backend can authenticate the user with its admin keys.
// Auth is fully owned by Clerk on the frontend; the backend owns all data.

const BASE = (import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/$/, "");

async function clerkToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const clerk = (
    window as unknown as { Clerk?: { session?: { getToken: () => Promise<string | null> } } }
  ).Clerk;
  try {
    return (await clerk?.session?.getToken()) ?? null;
  } catch {
    return null;
  }
}

export interface BackendFetchOptions {
  method?: string;
  /** JSON body — serialized and sent with the correct content-type. */
  json?: unknown;
}

export async function backendFetch<T>(path: string, options: BackendFetchOptions = {}): Promise<T> {
  if (!BASE) throw new Error("Backend is not configured. Set VITE_BACKEND_URL.");

  const token = await clerkToken();
  if (!token) throw new Error("No active session found.");

  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  let body: string | undefined;
  if (options.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.json);
  }

  const res = await fetch(`${BASE}${path}`, {
    method: options.method ?? (options.json !== undefined ? "POST" : "GET"),
    headers,
    body,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Request failed (${res.status})${detail ? `: ${detail}` : ""}`);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
