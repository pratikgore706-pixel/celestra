import { useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../i18n/I18n";
import type { DiagItem, LensResult } from "../api/types";
import type { Key } from "../i18n/strings";
import { KIND_COLOR } from "./CompareViewer";

/**
 * Sky Report: what the image shows (a plain-language paragraph built from measurements,
 * never invented), the famous objects in the frame, a shot diagnosis with next-time tips,
 * and the list of repairs Celestra actually applied.
 */
type T = (k: Key) => string;
const DIRS = ["right", "upper right", "top", "upper left", "left", "lower left", "bottom", "lower right"];
const fill = (s: string, o: Record<string, string | number>) => Object.entries(o).reduce((a, [k, v]) => a.split(`{${k}}`).join(String(v)), s);
const dirKey = (d: string) => `dir.${d}` as Key;

function lightTime(t: T, ly: number) {
  if (ly >= 1e6) return fill(t("rep.myears"), { n: (ly / 1e6).toFixed(ly >= 1e7 ? 0 : 1) });
  return fill(t("rep.years"), { n: Math.round(ly).toLocaleString() });
}
function fov(a: [number, number]) {
  const f = (m: number) => (m >= 120 ? `${(m / 60).toFixed(1)}°` : `${Math.round(m)}′`);
  return `${f(a[0])} × ${f(a[1])}`;
}
function bandDirs(angle: number): [string, string] {
  const th = (angle * Math.PI) / 180;
  const idx = (vx: number, vy: number) => ((Math.round(Math.atan2(-vy, vx) / (Math.PI / 4)) % 8) + 8) % 8;
  return [DIRS[idx(-Math.cos(th), -Math.sin(th))], DIRS[idx(Math.cos(th), Math.sin(th))]];
}
function joinList(parts: string[], and: string) {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} ${and} ${parts[parts.length - 1]}`;
}

export function describe(r: LensResult, t: T): string {
  const A = r.analysis;
  if (!A) return "";
  const out: string[] = [];
  const inside = A.field?.objects.filter((o) => o.inside) ?? [];
  const band = A.regions.find((g) => g.kind === "band");
  const named = (o: { id: string; name: string }) => (o.name ? `${o.name} (${o.id})` : o.id);
  if (A.field && inside.length) out.push(fill(t("p.known"), { objs: joinList(inside.slice(0, 3).map(named), t("p.and")), c: A.field.constellation, fov: fov(A.field.fov_arcmin) }));
  else if (A.field) out.push(fill(t("p.field"), { c: A.field.constellation, fov: fov(A.field.fov_arcmin) }));
  else if (band) { const [a, b] = bandDirs(band.angle); out.push(fill(t("p.band"), { a: t(dirKey(a)), b: t(dirKey(b)) })); }
  else if (A.density > 15) out.push(t("p.crowded"));
  else out.push(t("p.plain"));

  const k = A.kinds;
  const stars = (k.star ?? 0) + (k.bright_star ?? 0);
  const plural = (base: string, n: number) => (n === 1 ? t(`${base}.1` as Key) : fill(t(base as Key), { n }));
  const parts = [fill(t("p.stars"), { n: stars.toLocaleString(), b: k.bright_star ?? 0 })];
  if (k.galaxy) parts.push(plural("p.galaxies", k.galaxy));
  const neb = A.regions.filter((g) => g.kind === "nebula").length;
  if (neb) parts.push(plural("p.nebula", neb));
  if (A.clusters.length) parts.push(plural("p.clusters", A.clusters.length));
  if (A.trails.length) parts.push(plural("p.trails", A.trails.length));
  out.push(fill(t("p.count"), { n: A.total_detected.toLocaleString(), parts: joinList(parts, t("p.and")) }));

  const far = inside.find((o) => o.dist_ly);
  if (far) out.push(fill(t("p.light"), { name: named(far), t: lightTime(t, far.dist_ly) }));

  const d = Object.fromEntries(A.diagnosis.items.map((i) => [i.key, i])) as Record<string, DiagItem>;
  if (d.focus) {
    const f = `FWHM ${d.focus.value.toFixed(1)} px${d.focus.arcsec ? ` ≈ ${d.focus.arcsec}″` : ""}`;
    let s = fill(t(d.focus.grade >= 2 ? "p.sharp" : "p.soft"), { f });
    if (d.tracking) s += t(d.tracking.cause === "trailing" ? "p.trailing" : d.tracking.cause === "optics" ? "p.optics" : "p.round");
    s += d.glow?.toward ? fill(t("p.glow"), { d: t(dirKey(d.glow.toward)) }) : t("p.dark");
    out.push(s);
  }
  const nf = A.repairs.noise.factor;
  out.push(fill(t("p.restore"), { x: nf.toFixed(1) }) + t(r.seal.sealed ? "p.sealed" : "p.unsealed"));
  if (!A.field) out.push(t("p.nowcs"));
  return out.join(" ");
}

const GRADE_C = ["var(--bad)", "var(--warn)", "var(--accent)", "var(--good)"];

function tip(i: DiagItem, t: T, hot: number) {
  switch (i.key) {
    case "focus": return t(i.grade >= 2 ? "t.focus.ok" : "t.focus.bad");
    case "tracking": return t(i.cause === "trailing" ? "t.track.trail" : i.cause === "optics" ? "t.track.optics" : "t.track.ok");
    case "noise": return t(i.grade >= 2 ? "t.noise.ok" : "t.noise.bad");
    case "glow": return i.toward ? fill(t("t.glow.dir"), { d: t(dirKey(i.toward)) }) : t("t.glow.ok");
    case "saturation": return i.value > 2 ? fill(t("t.sat.bad"), { n: i.value }) : t("t.sat.ok");
    default: {
      const n = i.trails ?? 0;
      const parts = [hot ? fill(t("r.hot"), { n: hot }) : "", n ? (n === 1 ? t("p.trails.1") : fill(t("p.trails"), { n })) : ""].filter(Boolean);
      return parts.length ? `${parts.join(" · ")}. ${t("t.def.bad")}` : t("t.def.ok");
    }
  }
}
function value(i: DiagItem) {
  switch (i.key) {
    case "focus": return `${i.value.toFixed(1)} px${i.arcsec ? ` · ${i.arcsec}″` : ""}`;
    case "tracking": return `e ${i.value.toFixed(2)}`;
    case "noise": return `${Math.round(i.value)}:1`;
    case "glow": return `${i.value.toFixed(0)}%`;
    default: return String(i.value);
  }
}

function Score({ v }: { v: number }) {
  const c = v >= 80 ? "var(--good)" : v >= 60 ? "var(--accent)" : v >= 40 ? "var(--warn)" : "var(--bad)";
  return (
    <div className="sr-score">
      <svg viewBox="0 0 80 80" aria-hidden="true">
        <circle cx="40" cy="40" r="33" fill="none" stroke="var(--ring-track)" strokeWidth="6" />
        <circle cx="40" cy="40" r="33" fill="none" stroke={c} strokeWidth="6" strokeLinecap="round" pathLength={100}
          strokeDasharray={`${v} 100`} transform="rotate(-90 40 40)" />
      </svg>
      <b>{v}</b>
    </div>
  );
}

export default function SkyReport({ r }: { r: LensResult }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const A = r.analysis;
  if (!A) return null;
  const text = describe(r, t);
  const rep = A.repairs;
  const hot = rep.hot_pixels;
  const objs = A.field?.objects ?? [];
  const copy = () => { navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600); }).catch(() => {}); };
  const repairs: [boolean, string][] = [
    [true, fill(t("r.noise"), { x: rep.noise.factor.toFixed(1) })],
    [rep.deblur_iters > 0, rep.deblur_iters > 0 ? fill(t("r.deblur"), { n: rep.deblur_iters }) : t("r.nodeblur")],
    [hot.n > 0, !hot.enabled ? t("r.hot.off") : hot.note === "undersampled" ? t("r.hot.under") : hot.n ? fill(t("r.hot"), { n: hot.n }) : t("r.hot.none")],
    [rep.glow.flattened, !rep.glow.enabled ? t("r.glow.off") : rep.glow.flattened ? fill(t("r.glow"), { p: rep.glow.pct.toFixed(0) }) + (rep.glow.toward ? ` · ${t(dirKey(rep.glow.toward))}` : "") : t("r.glow.none")],
    [r.seal.sealed, t(r.seal.sealed ? "r.seal.ok" : "r.seal.bad")],
  ];

  return (
    <div className="sr">
      <section className="sr-about">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="eyebrow">{t("rep.about")}</div>
          <button className="btn ghost sm" onClick={copy}>{copied ? t("rep.copied") : t("rep.copy")}</button>
        </div>
        <p className="sr-para">{text}</p>
        {objs.length > 0 && (
          <>
            <div className="eyebrow" style={{ marginTop: 18 }}>{t("rep.named")}</div>
            <ul className="sr-objs">
              {objs.map((o) => (
                <li key={o.id}>
                  <i style={{ background: KIND_COLOR.known }} />
                  <div>
                    <b>{o.id}{o.name ? ` · ${o.name}` : ""}</b>
                    <span>{t(`otype.${o.type}` as Key)} · {fill(t("rep.dist"), { d: o.dist_ly.toLocaleString() })}{o.inside ? "" : ` · ${t("rep.edge")}`}</span>
                    <span className="sr-light">{fill(t("rep.light"), { t: lightTime(t, o.dist_ly) })}</span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="sr-diag">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div className="eyebrow">{t("rep.diag")}</div>
          <div className="row" style={{ gap: 10, alignItems: "center" }}><span className="small faint">{t("rep.score")}</span><Score v={A.diagnosis.score} /></div>
        </div>
        <ul className="sr-items">
          {A.diagnosis.items.map((i) => (
            <li key={i.key}>
              <div className="sr-item-h">
                <b>{t(`d.${i.key}` as Key)}</b>
                <span className="mono small faint">{value(i)}</span>
                <span className="sr-grade" style={{ color: GRADE_C[i.grade], borderColor: GRADE_C[i.grade] }}>{t(`grade.${i.grade}` as Key)}</span>
              </div>
              <div className="sr-bar">{[0, 1, 2].map((n) => <i key={n} style={{ background: n < i.grade ? GRADE_C[i.grade] : undefined }} />)}</div>
              <p>{tip(i, t, hot.n)}{i.key === "glow" && i.toward && <> <Link to="/watchtower">{t("rep.darker")} →</Link></>}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="sr-rep">
        <div className="eyebrow">{t("rep.repairs")}</div>
        <ul className="sr-list">
          {repairs.map(([on, txt], i) => (
            <li key={i} className={on ? "on" : ""}>
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                {on ? <path d="M4.5 9.2l2.8 2.8 6-6.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  : <circle cx="9" cy="9" r="2.4" fill="currentColor" />}
              </svg>
              <span>{txt}</span>
            </li>
          ))}
        </ul>
        <p className="small faint" style={{ marginTop: 14 }}>{fill(t("r.time"), { s: A.seconds })}</p>
      </section>
    </div>
  );
}
