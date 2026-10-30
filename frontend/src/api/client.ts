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

/* ---------- request tracking (drives the top progress bar) ---------- */
let inflight = 0;
let oldest = 0;
export type NetState = { busy: boolean; slow: boolean };
function emit() {
  const busy = inflight > 0;
  window.dispatchEvent(new CustomEvent<NetState>("celestra:net", { detail: { busy, slow: busy && Date.now() - oldest > 4000 } }));
}
setInterval(() => { if (inflight > 0) emit(); }, 1000);

/* ---------- response cache: data stays for a while, so moving between pages is instant ---------- */
const TTL: [RegExp, number][] = [
  [/^\/api\/sky\/moon/, 5 * 60_000],
  [/^\/api\/(watchtower|score|sky\/month|sky\/upcoming|sky\/iss|sky\/launches|geocode)/, 15 * 60_000],
];
const cache = new Map<string, { at: number; ttl: number; value: unknown }>();
const pending = new Map<string, Promise<unknown>>();
const ttlFor = (path: string) => TTL.find(([re]) => re.test(path))?.[1] ?? 0;
const STORE_KEY = "celestra.cache.v1";
try {
  const saved = JSON.parse(sessionStorage.getItem(STORE_KEY) || "{}");
  for (const [k, v] of Object.entries(saved)) cache.set(k, v as { at: number; ttl: number; value: unknown });
} catch { /* storage unavailable */ }
let saveTimer = 0;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      const now = Date.now();
      const obj: Record<string, unknown> = {};
      for (const [k, v] of cache) if (now - v.at < v.ttl) obj[k] = v;
      sessionStorage.setItem(STORE_KEY, JSON.stringify(obj));
    } catch { /* quota or unavailable */ }
  }, 400);
}
/** Drop cached answers (e.g. after logging an observation). */
export function invalidate(prefix = "") {
  for (const k of [...cache.keys()]) if (k.startsWith(prefix)) cache.delete(k);
  persist();
}

// Background checks (status light, job progress) don't count as "the page is loading".
const isBackground = (path: string) => path === "/api/health" || /^\/api\/lens\/jobs\//.test(path);

async function load<T>(path: string, init?: RequestInit): Promise<Envelope<T>> {
  const track = !isBackground(path);
  if (track) { if (inflight++ === 0) oldest = Date.now(); emit(); }
  try {
    const r = await fetchWithWake(`${API_BASE}${path}`, init);
    if (!r.ok) {
      let msg = `${r.status} ${r.statusText}`;
      try { const j = await r.json(); if (j?.detail) msg = j.detail; } catch { /* not json */ }
      throw new Error(msg);
    }
    return await r.json();
  } finally {
    if (track) { inflight--; emit(); }
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<Envelope<T>> {
  const method = (init?.method || "GET").toUpperCase();
  const ttl = method === "GET" ? ttlFor(path) : 0;
  if (!ttl) return load<T>(path, init);
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < hit.ttl) return hit.value as Envelope<T>;
  const same = pending.get(path);
  if (same) return same as Promise<Envelope<T>>;
  const p = load<T>(path, init)
    .then((v) => { if (v?.meta?.status !== "demo") { cache.set(path, { at: Date.now(), ttl, value: v }); persist(); } return v; })
    .finally(() => pending.delete(path));
  pending.set(path, p);
  return p;
}
