import type { ReactNode } from "react";
import Enso from "./Enso";
import { useI18n } from "../i18n/I18n";
import { usePlace } from "../lib/place";
import { locale } from "../lib/format";

export function Panel({ kj, title, right, children, className = "" }: {
  kj?: string; title: string; right?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-h">
        <h2>{kj && <span className="hanko-kj" aria-hidden="true">{kj}</span>}<span className="panel-title">{title}</span></h2>
        {right}
      </div>
      {children}
    </section>
  );
}

/** Small spinning ring for anything that is loading. */
export function Spinner({ label }: { label?: string }) {
  return <span className="spinner-row" role="status"><span className="spinner" aria-hidden="true" />{label}</span>;
}

export function Slot({ title, body, h = 140, loading = false }: { title?: string; body: string; h?: number; loading?: boolean }) {
  return (
    <div className={`slot ${loading ? "loading" : ""}`} style={{ minHeight: h }} aria-busy={loading || undefined}>
      <div className="slot-in">
        {loading
          ? <Enso size={Math.max(40, Math.min(72, h * 0.34))} />
          : h >= 180 && <Enso size={Math.min(84, h * 0.34)} color="var(--ring-track)" />}
        <div>{title && <b>{title}</b>}{body}</div>
      </div>
    </div>
  );
}

export function PageScene({ kanji, title, sub, children }: { kanji: string; title: string; sub: string; children: ReactNode }) {
  const { lang } = useI18n();
  const { place } = usePlace();
  const today = new Date().toLocaleDateString(locale(lang), { weekday: "long", day: "numeric", month: "long" });
  return (
    <header className="scene">
      {children}
      <div className="mist m1" aria-hidden="true" /><div className="mist m2" aria-hidden="true" />
      <div className="seigaiha" aria-hidden="true" />
      <div className="scene-text">
        <div className="scene-kanji" aria-hidden="true">{kanji}</div>
        <div className="scene-head">
          <span className="scene-seal" aria-hidden="true">{[...kanji].map((ch, i) => <span key={i}>{ch}</span>)}</span>
          <div>
            <div className="scene-eyebrow">{today} · {place.name}</div>
            <h1>{title}</h1>
            <p>{sub}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
