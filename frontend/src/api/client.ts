// Empty base = same origin; Vite proxies /api to the backend (see vite.config.ts).
export const API_BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");

/** Full URL for a backend path (images, downloads) when the API lives on another domain. */
export const apiUrl = (path: string) => (path.startsWith("/api") ? `${API_BASE}${path}` : path);

export type Meta = {
  source: string;
  status: "live" | "cached" | "computed" | "demo";
  fetched_at: string;
  formula_version?: string;
};
export type Envelope<T> = { data: T; meta: Meta };

const RETRY_MS = [3000, 6000, 10000, 15000, 20000]; // ~1 min: covers a sleeping free-tier server waking up
const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

/** GET requests retry while the server is unreachable or still starting (network error, 502/503/504). */
async function fetchWithWake(url: string, init?: RequestInit): Promise<Response> {
  const method = (init?.method || "GET").toUpperCase();
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(url, init);
      if (method !== "GET" || ![502, 503, 504].includes(r.status) || i >= RETRY_MS.length) return r;
    } catch (e) {
      if (method !== "GET" || i >= RETRY_MS.length || (e as Error)?.name === "AbortError") throw e;
    }
    await sleep(RETRY_MS[i]);
    if (init?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<Envelope<T>> {
  const r = await fetchWithWake(`${API_BASE}${path}`, init);
  if (!r.ok) {
    let msg = `${r.status} ${r.statusText}`;
    try { const j = await r.json(); if (j?.detail) msg = j.detail; } catch { /* not json */ }
    throw new Error(msg);
  }
  return r.json();
}
