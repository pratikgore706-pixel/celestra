import { useEffect, useState } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import { useI18n } from "../i18n/I18n";
import { LANGS } from "../i18n/strings";
import { api } from "../api/client";
import type { Alert, MoonInfo } from "../api/types";
import { usePlace } from "../lib/place";
import { fmtTime } from "../lib/format";
import { scheduleNotifications } from "../lib/alerts";
import MonLogo from "./MonLogo";

/** Two looks: Night (deep space) and Dawn (lighter steel blue for daytime). */
function ThemeSwitch() {
  const { t } = useI18n();
  const [theme, setTheme] = useState<"yoru" | "akatsuki">(() => {
    try { return localStorage.getItem("celestra.theme") === "akatsuki" ? "akatsuki" : "yoru"; } catch { return "yoru"; }
  });
  useEffect(() => {
    if (theme === "akatsuki") document.documentElement.setAttribute("data-theme", "akatsuki");
    else document.documentElement.removeAttribute("data-theme");
    try { localStorage.setItem("celestra.theme", theme); } catch { /* ignore */ }
  }, [theme]);
  return (
    <div className="sky-switch" role="group" aria-label={t("theme.label")}>
      <button aria-pressed={theme === "yoru"} onClick={() => setTheme("yoru")} title={t("theme.yoru")}><span className="kjs">{t("theme.yoru.s")}</span></button>
      <button aria-pressed={theme === "akatsuki"} onClick={() => setTheme("akatsuki")} title={t("theme.akatsuki")}><span className="kjs">{t("theme.akatsuki.s")}</span></button>
    </div>
  );
}

/** A note when the free-tier server is slow to answer because it is waking up. */
function NetBar() {
  const { t } = useI18n();
  const [st, setSt] = useState({ busy: false, slow: false });
  const [show, setShow] = useState(false);
  useEffect(() => {
    const on = (e: Event) => setSt((e as CustomEvent<{ busy: boolean; slow: boolean }>).detail);
    window.addEventListener("celestra:net", on);
    return () => window.removeEventListener("celestra:net", on);
  }, []);
  useEffect(() => {
    if (!st.busy) { setShow(false); return; }
    const id = setTimeout(() => setShow(true), 150);
    return () => clearTimeout(id);
  }, [st.busy]);
  return (
    <>
      {show && st.slow && <div className="netnote" role="status"><span className="spinner" aria-hidden="true" />{t("net.waking")}</div>}
    </>
  );
}

function ApiStatus() {
  const { t } = useI18n();
  const [s, setS] = useState<"wait" | "ok" | "down">("wait");
  useEffect(() => {
    let alive = true;
    const ping = () => api("/api/health").then(() => alive && setS("ok")).catch(() => alive && setS("down"));
    ping();
    const id = setInterval(ping, 15000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  return <span className={`api ${s}`}><i />{t(`api.${s}`)}</span>;
}

/** "The Moon rises tonight at 8:14 PM" + today's reminders, computed for the saved place. */
function OmamoriBanner() {
  const { t, lang } = useI18n();
  const { place } = usePlace();
  const [moon, setMoon] = useState<MoonInfo | null>(null);
  const [today, setToday] = useState<Alert[]>([]);
  const [hide, setHide] = useState(false);
  useEffect(() => {
    api<MoonInfo>(`/api/sky/moon?lat=${place.lat}&lon=${place.lon}`).then((r) => setMoon(r.data)).catch(() => {});
    api<Alert[]>("/api/sky/alerts").then((r) => {
      const now = Date.now();
      const soon = r.data.filter((a) => { const d = new Date(a.at).getTime() - now; return d > 0 && d < 24 * 3600 * 1000; });
      setToday(soon);
      scheduleNotifications(r.data, (iso) => fmtTime(iso, lang));
    }).catch(() => {});
  }, [place.lat, place.lon, lang]);
  if (hide || !moon) return null;
  const now = Date.now();
  const rise = moon.rise ? new Date(moon.rise).getTime() : null;
  const msg = moon.altitude > 0 && moon.set
    ? t("banner.moonup").replace("{t}", fmtTime(moon.set, lang))
    : rise && rise > now && rise - now < 20 * 3600 * 1000
      ? t("banner.moonrise").replace("{t}", fmtTime(moon.rise, lang))
      : null;
  if (!msg && today.length === 0) return null;
  return (
    <div className="omamori" role="status">
      <div className="omamori-in">
        <span className="omamori-mark" aria-hidden="true">{t("omamori")}</span>
        {msg && <span>{msg}</span>}
        {today.slice(0, 2).map((a) => <span key={a.id} className="muted">· {t("banner.reminder").replace("{title}", a.title).replace("{t}", fmtTime(a.at, lang))}</span>)}
        <button className="omamori-x" onClick={() => setHide(true)} aria-label="Dismiss">×</button>
      </div>
    </div>
  );
}

export default function Layout() {
  const { t, lang, setLang } = useI18n();
  const links = [
    { to: "/dojo", k: "nav.dojo" },
    { to: "/watchtower", k: "nav.watchtower" },
    { to: "/scroll", k: "nav.scroll" },
    { to: "/lens", k: "nav.lens" },
    { to: "/guide", k: "nav.guide" },
  ] as const;
  return (
    <div className="shell">
      <div className="topbar">
        <div className="topbar-in">
          <Link to="/" className="brand" aria-label="Celestra home">
            <MonLogo />
            <span className="brand-name">Celestra</span>
          </Link>
          <nav className="nav" aria-label="Main">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to}>
                {t(l.k)}
              </NavLink>
            ))}
          </nav>
          <div className="bar-right">
            <ApiStatus />
            <ThemeSwitch />
            <div className="lang" role="group" aria-label="Language">
              {LANGS.map((l) => (
                <button key={l.code} aria-pressed={lang === l.code} onClick={() => setLang(l.code)}>{l.label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <NetBar />
      <OmamoriBanner />
      <main><Outlet /></main>
      <footer className="foot">
        <div><span>{t("foot.tag")}</span><span className="mono">Celestra · {t("foot.local")}</span></div>
      </footer>
    </div>
  );
}
