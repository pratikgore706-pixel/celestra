import type { ReactNode } from "react";
import Enso from "./Enso";
import { useI18n } from "../i18n/I18n";
import { usePlace } from "../lib/place";
import { locale } from "../lib/format";

export function Panel({ title, right, children, className = "" }: {
  kj?: string; title: string; right?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-h">
        <h2><span className="panel-title">{title}</span></h2>
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
          : h >= 180 && (
            <span className="slot-ic" aria-hidden="true">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />
              </svg>
            </span>
          )}
        <div>{title && <b>{title}</b>}{body}</div>
      </div>
    </div>
  );
}

export function PageScene({ title, sub, children }: { kanji?: string; title: string; sub: string; children: ReactNode }) {
  const { lang } = useI18n();
  const { place } = usePlace();
  const today = new Date().toLocaleDateString(locale(lang), { weekday: "long", day: "numeric", month: "long" });
  return (
    <header className="scene">
      <img className="scene-sky" src="/landing/sky.webp" alt="" aria-hidden="true" draggable={false} />
      {children}
      <div className="mist m1" aria-hidden="true" /><div className="mist m2" aria-hidden="true" />
      <div className="seigaiha" aria-hidden="true" />
      <div className="scene-text">
        <div className="scene-head">
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
