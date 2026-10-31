import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../i18n/I18n";
import Scene from "../components/Scene";
import { Panel, Slot, PageScene } from "../components/Panel";
import HonorCurve from "../components/HonorCurve";
import MoonGlyph from "../components/MoonGlyph";
import { api } from "../api/client";
import type { IssPass, MoonInfo, Score, SkyEvent, WatchtowerData } from "../api/types";
import { TYPE_COLOR } from "../lib/alerts";
import CompareViewer from "../components/CompareViewer";
import SealPanel from "../components/SealPanel";
import HonorPanel from "../components/HonorPanel";
import SkyDome from "../components/SkyDome";
import Enso from "../components/Enso";
import { BAND_HEX, evTitle, lunarName, locale } from "../lib/format";
import type { LensJob, LensResult } from "../api/types";
import { usePlace } from "../lib/place";
import { BAND_COLOR, fmtDate, fmtTime, todayLocal } from "../lib/format";

function Tonight() {
  const { t, lang } = useI18n();
  const { place, planned } = usePlace();
  const at = planned ?? place;
  const [s, setS] = useState<Score | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    setErr(null);
    api<Score>(`/api/score?lat=${at.lat}&lon=${at.lon}&date=${todayLocal()}&mode=casual`)
      .then((r) => setS(r.data)).catch((e) => setErr(String(e.message || e)));
  }, [at.lat, at.lon]);
  return (
    <Panel className="span-4" title={t("dojo.tonight")}>
      <div className="faint small">{planned ? t("dojo.planned") : t("dojo.yourpoint")}: <span className="muted">{at.name}</span></div>
      {err && <p className="small" style={{ color: "var(--bad)" }}>{err}</p>}
      {s && (
        <>
          <div className="row" style={{ alignItems: "flex-end", marginTop: 6 }}>
            <Enso size={112} value={s.headline}><div className="stat num">{Math.round(s.headline)}</div></Enso>
            <div>
              <div className="band-name" style={{ color: BAND_COLOR[s.band] }}>{t(`band.${s.band}`)}</div>
              {s.window && <div className="small muted num">{fmtTime(s.window.start, lang)} – {fmtTime(s.window.end, lang)}</div>}
            </div>
          </div>
          <HonorCurve score={s} height={110} />
        </>
      )}
      {!s && !err && <Slot loading body={t("watch.loading")} h={150} />}
      <Link to="/watchtower" className="small">{t("dojo.goto.watch")} →</Link>
    </Panel>
  );
}

function Moon() {
  const { t, lang } = useI18n();
  const { place } = usePlace();
  const [m, setM] = useState<MoonInfo | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api<MoonInfo>(`/api/sky/moon?lat=${place.lat}&lon=${place.lon}`).then((r) => setM(r.data)).catch((e) => setErr(String(e.message || e)));
  }, [place.lat, place.lon]);
  return (
    <Panel className="span-4" title={t("dojo.moon")}>
      {err && <p className="small" style={{ color: "var(--bad)" }}>{err}</p>}
      {m ? (
        <div className="moon-card2">
          <div className="moon-hero">
            <MoonGlyph angle={m.phase_angle} size={132} />
            <div>
              <div className="moon-kanji loc">{lunarName(m.lunar_day, t, lang).name}</div>
              <div className="moon-phase">{t(`moon.phase.${m.phase_name}`)}</div>
              <div className="moon-pct"><b className="num">{Math.round(m.illumination * 100)}%</b> <span>{t("moon.illum")}</span></div>
            </div>
          </div>
          <div className="moon-cycle" aria-hidden="true"><i style={{ width: `${Math.min(100, (Number(m.lunar_day) / 29.53) * 100).toFixed(1)}%` }} /></div>
          <dl className="moon-stats">
            <div><dt>{t("moon.rise")}</dt><dd className="num">{fmtTime(m.rise, lang)}</dd></div>
            <div><dt>{t("moon.set")}</dt><dd className="num">{fmtTime(m.set, lang)}</dd></div>
            <div><dt>{t("moon.full")}</dt><dd className="num">{fmtDate(m.next_phases.full, lang)}</dd></div>
            <div><dt>{t("moon.new")}</dt><dd className="num">{fmtDate(m.next_phases.new, lang)}</dd></div>
          </dl>
        </div>
      ) : !err && <Slot loading body={t("watch.loading")} />}
    </Panel>
  );
}

function countdown(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  const d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000), m = Math.floor((ms % 3600000) / 60000);
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function ComingUp() {
  const { t, lang } = useI18n();
  const { place } = usePlace();
  const [evs, setEvs] = useState<SkyEvent[] | null>(null);
  useEffect(() => {
    // show the computed events as soon as they arrive; add the ISS pass when it lands
    let base: SkyEvent[] = [], issEv: SkyEvent | null = null, alive = true;
    const show = () => alive && setEvs([...base, ...(issEv ? [issEv] : [])].sort((x, y) => x.start.localeCompare(y.start)).slice(0, 4));
    api<SkyEvent[]>(`/api/sky/upcoming?lat=${place.lat}&lon=${place.lon}`)
      .then((r) => { base = r.data.filter((e) => e.visible !== false); show(); })
      .catch(() => show());
    api<{ passes: IssPass[] }>(`/api/sky/iss?lat=${place.lat}&lon=${place.lon}`).then((r) => {
      const p = r.data.passes[0];
      if (!p) return;
      issEv = { id: "iss", type: "iss", title: `ISS · ${p.start_dir} → ${p.end_dir}, ${p.max_alt}°`, start: p.start, visible: true, detail: {}, source: "", url: "", status: "computed" };
      show();
    }).catch(() => { /* ISS is optional here */ });
    return () => { alive = false; };
  }, [place.lat, place.lon]);
  return (
    <Panel className="span-4" title={t("dojo.next")}>
      {!evs && <Slot loading body={t("watch.loading")} />}
      <ul className="coming">
        {evs?.map((e) => (
          <li key={e.id}>
            <i className="dot" style={{ background: TYPE_COLOR[e.type] }} />
            <span><b>{evTitle(e, t)}</b><br /><span className="small muted num">{new Date(e.start).toLocaleString(locale(lang), { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span></span>
            <span className="mono num cd">{countdown(e.start)}</span>
          </li>
        ))}
      </ul>
      <Link to="/scroll" className="small">{t("nav.scroll")} →</Link>
    </Panel>
  );
}

function TopSpots() {
  const { t } = useI18n();
  const { place } = usePlace();
  const [d, setD] = useState<WatchtowerData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api<WatchtowerData>(`/api/watchtower?lat=${place.lat}&lon=${place.lon}&date=${todayLocal()}&mode=casual`)
      .then((r) => setD(r.data)).catch((e) => setErr(String(e.message)));
  }, [place.lat, place.lon]);
  return (
    <Panel className="span-12" title={t("dojo.spots")} right={<Link to="/watchtower" className="small">{t("dojo.goto.watch")} →</Link>}>
      {err && <p className="small" style={{ color: "var(--bad)" }}>{err}</p>}
      {!d && !err && <Slot loading body={t("watch.loading")} h={90} />}
      <div className="top-spots">
        {d?.spots.slice(0, 3).map((s, i) => (
          <div key={s.id} className="top-spot">
            <span className="rank-n roman">{["I", "II", "III"][i] ?? i + 1}</span>
            <div style={{ minWidth: 0 }}><b>{s.name}</b><div className="small faint">{t(`type.${s.type}`)} · {s.dist_km} {t("watch.km")}</div></div>
            <span className="rank-score num" style={{ color: BAND_COLOR[s.score.band] }}>{Math.round(s.score.headline)}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function LensWorkspace() {
  const { t } = useI18n();
  const [r, setR] = useState<LensResult | null>(null);
  const [mist, setMist] = useState(false);
  useEffect(() => {
    (async () => {
      const x = await api<{ id: string | null }>("/api/lens/jobs/latest");
      if (!x.data.id) return;
      const j = await api<LensJob>(`/api/lens/jobs/${x.data.id}`);
      if (j.data.result?.seal) setR(j.data.result);
    })().catch(() => {});
  }, []);
  return (
    <Panel className="span-7" title={t("dojo.lens")}
      right={r && <div className="seg"><button aria-pressed={mist} onClick={() => setMist((v) => !v)}>{t("lens.mist")}</button></div>}>
      {r ? (
        <div className="dojo-lens">
          <CompareViewer r={r} overlay mist={mist} selected={null} maxHeight={340} />
          <SealPanel r={r} compact />
        </div>
      ) : <Slot body={t("dojo.lens.empty")} h={300} />}
      <Link to="/lens" className="small">{t("nav.lens")} →</Link>
    </Panel>
  );
}

export default function Dojo() {
  const { t } = useI18n();
  return (
    <>
      <PageScene title={t("dojo.title")} sub={t("dojo.sub")}><Scene variant="dojo" /></PageScene>
      <div className="page">
        <div className="grid g-12">
          <Tonight />
          <Moon />
          <ComingUp />
          <LensWorkspace />
          <Panel className="span-5" title={t("dojo.sky")}><SkyDome /></Panel>
          <TopSpots />
          
          <HonorPanel className="span-12" />
        </div>
      </div>
    </>
  );
}
