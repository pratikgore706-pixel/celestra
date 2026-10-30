import type { Lang } from "../i18n/strings";

const LOCALE: Record<Lang, string> = { en: "en-IN", hi: "hi-IN", ja: "ja-JP", pa: "pa-IN" };

export function fmtTime(iso: string | null | undefined, lang: Lang) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString(LOCALE[lang], { hour: "numeric", minute: "2-digit" });
}
export function fmtHour(iso: string, lang: Lang) {
  return new Date(iso).toLocaleTimeString(LOCALE[lang], { hour: "numeric" });
}
export function fmtDate(iso: string | null | undefined, lang: Lang) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(LOCALE[lang], { day: "numeric", month: "short" });
}
export function todayLocal() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const BAND_COLOR: Record<string, string> = {
  shogun: "var(--good)", clear: "var(--accent)", mist: "var(--warn)", storm: "var(--bad)",
};
export const BAND_HEX: Record<string, string> = {
  shogun: "#3ddc97", clear: "#5b9cff", mist: "#ffb547", storm: "#ff5d5d",
};

type T = (k: string) => string;
type Ev = { type: string; title: string; detail?: Record<string, any> };

/** Event title in the selected language (backend titles are English). */
export function evTitle(e: Ev, t: T): string {
  const d = e.detail || {};
  if (e.type === "moon" && d.quarter) return t(`ev.moon.${d.quarter}`);
  if (e.type === "meteor") return t("ev.meteor").replace("{n}", e.title.replace(/ peak$/, ""));
  if (e.type === "eclipse" && d.kind) {
    const k = t(`ev.kind.${d.kind}`);
    return t(/solar/i.test(e.title) ? "ev.solar" : "ev.lunar").replace("{k}", k);
  }
  if (e.type === "planet") { const v = t(`planet.${e.title}`); return v.startsWith("planet.") ? e.title : v; }
  return e.title;
}

/** Name of a lunar night in the selected language; Japanese kanji only in Japanese. */
export function lunarName(ld: { day: number; kanji: string; romaji: string }, t: T, lang: Lang): { name: string; sub: string } {
  void lang;
  return { name: t("lunar.day").replace("{n}", String(ld.day)), sub: "" };
}

export function locale(lang: Lang) { return LOCALE[lang]; }
