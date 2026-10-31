import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../i18n/I18n";
import { LANDING } from "../i18n/landing";
import BadgeIcon from "../components/BadgeIcon";

/**
 * Scroll story. A sticky stage holds the layers:
 *   1. the night sky (Milky Way + constellations) that rolls with scroll, behind everything,
 *   2. the mountain range, which sinks a little as you scroll (you are looking up),
 *   3. the young explorer on the rock, with the scarf as its own layer so it flutters.
 * Left: the CELESTRA mark. Right: five chapters that arrive as you scroll.
 * Everything is driven from one rAF loop writing CSS variables / styles (no re-renders).
 */
const SRC = "/landing/";
const SCARF_PIVOT = "43.4% 20.3%"; // the knot at the explorer's neck on the 1341x866 canvas

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export default function Landing() {
  const { lang } = useI18n();
  const L = LANDING[lang];
  const N = L.chapters.length;
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const chapters = useRef<(HTMLElement | null)[]>([]);
  const dots = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const el = root.current, st = stage.current;
    if (!el || !st) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const q = <T extends HTMLElement>(c: string) => st.querySelector<T>(c);
    const sky = q(".lp-sky"), sun = q(".lp-sun"), moon = q(".lp-moon"), moonGlow = q(".lp-moon-glow");
    const mtn = q(".lp-mtn"), mtnDay = q(".lp-mtn-day"), dusk = q(".lp-dusk"), scene = q(".lp-scene"), rib = q(".lp-rib"), cue = q(".lp-cue");
    let target = 0, cur = -1, shown = -1, raf = 0, W = 0, H = 0, VH = 0, lastActive = -1;

    // Everything below is transform/opacity only (GPU-composited): no layout, no filters, no
    // style variables on the whole scene. The loop runs only while the scene is catching up
    // with the scroll position, then stops.
    const apply = (p: number) => {
      sky && (sky.style.transform = `translate(-50%, -50%) rotate(${(reduce ? 25 : 25 - p * 70).toFixed(2)}deg) scale(${(1 + p * 0.05).toFixed(4)})`);
      // Sun and Moon ride one arc: the Sun starts high and sets behind the left mountains,
      // the Moon (opposite it) rises on the right and ends high. Positions are % of the scene.
      const th = ((95 + 180 * p) * Math.PI) / 180;
      const narrow = W < 860;
      const cx = narrow ? 78 : 50, rx = narrow ? 18 : 40, ry = narrow ? 42 : 88, cy = narrow ? 63 : 108;
      const c = Math.cos(th), sn = Math.sin(th);
      sun && (sun.style.transform = `translate3d(${((W * (cx + rx * c)) / 100).toFixed(1)}px, ${((H * (cy - ry * sn)) / 100).toFixed(1)}px, 0) translate(-50%, -50%)`);
      moon && (moon.style.transform = `translate3d(${((W * (cx - rx * c)) / 100).toFixed(1)}px, ${((H * (cy + ry * sn)) / 100).toFixed(1)}px, 0) translate(-50%, -50%)`);
      const day = smooth(0.15, 0.85, sn);
      mtnDay && (mtnDay.style.opacity = day.toFixed(3));
      dusk && (dusk.style.opacity = day.toFixed(3));
      moonGlow && (moonGlow.style.opacity = (0.4 + 0.6 * smooth(0.1, 0.7, -sn)).toFixed(3));
      mtn && (mtn.style.transform = `translate3d(-50%, ${((p * 7 * VH) / 100).toFixed(1)}px, 0)`);
      scene && (scene.style.transform = `${narrow ? "translateX(-50%) " : ""}scale(${(1.06 - p * 0.06).toFixed(4)})`);
      rib && !reduce && (rib.style.transform = `rotate(${(Math.sin(p * Math.PI * 8 + 0.8) * 4).toFixed(2)}deg) scaleX(${(1 + Math.sin(p * Math.PI * 8) * 0.05).toFixed(3)})`);
      cue && (cue.style.opacity = Math.max(0, 1 - p * 8).toFixed(3));
      const pos = p * N;
      chapters.current.forEach((ch, i) => {
        if (!ch) return;
        const local = pos - i;
        const a = (i === 0 ? 1 : smooth(0, 0.14, local)) * (i === N - 1 ? 1 : 1 - smooth(0.86, 1, local));
        ch.style.opacity = a.toFixed(3);
        ch.style.transform = `translate3d(0, ${((0.5 - Math.min(1, Math.max(0, local))) * 36).toFixed(1)}px, 0)`;
        ch.style.visibility = a < 0.01 ? "hidden" : "visible";
        ch.setAttribute("aria-hidden", a < 0.5 ? "true" : "false");
      });
      const active = Math.min(N - 1, Math.max(0, Math.floor(pos)));
      if (active !== lastActive) {
        lastActive = active;
        dots.current.forEach((d, i) => d?.setAttribute("data-on", i === active ? "1" : i < active ? "past" : "0"));
      }
    };
    const frame = () => {
      raf = 0;
      cur = cur < 0 || reduce ? target : cur + (target - cur) * 0.2;
      if (Math.abs(target - cur) < 0.0004) cur = target;
      if (cur !== shown) { apply(cur); shown = cur; }
      if (cur !== target) raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
    const read = () => {
      const r = el.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      target = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
      kick();
    };
    // keep the pinned scene exactly below the top bar (its height changes on phones)
    const bar = document.querySelector<HTMLElement>(".topbar");
    const fit = () => {
      el.style.setProperty("--bar", `${bar ? bar.offsetHeight : 0}px`);
      W = st.clientWidth; H = st.clientHeight; VH = window.innerHeight;
      shown = -1; read();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(st);
    if (bar) ro.observe(bar);
    window.addEventListener("scroll", read, { passive: true });
    return () => { cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener("scroll", read); };
  }, [N]);

  const jump = (i: number) => {
    const el = root.current; if (!el) return;
    const span = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: el.offsetTop + span * ((i + 0.5) / N), behavior: "smooth" });
  };

  return (
    <section className="lp" ref={root} style={{ height: `${N * 110 + 100}vh` }}>
      <div className="lp-stage" ref={stage}>
        <div className="lp-sky" aria-hidden="true"><img src={`${SRC}sky.webp`} alt="" draggable={false} /></div>
        <div className="lp-glow" aria-hidden="true" />
        <div className="lp-sun" aria-hidden="true"><i /></div>
        <div className="lp-moon" aria-hidden="true"><i className="lp-moon-glow" /><img src={`${SRC}moon.webp`} alt="" draggable={false} /></div>
        <div className="lp-shoot" aria-hidden="true"><i /><i /><i /></div>
        <div className="lp-dusk" aria-hidden="true" />
        <div className="lp-mtn" aria-hidden="true">
          <img src={`${SRC}mountains.webp`} alt="" draggable={false} />
          <img className="lp-mtn-day" src={`${SRC}mountains_day.webp`} alt="" draggable={false} />
        </div>
        <div className="lp-scene" aria-hidden="true">
          <div className="lp-rib" style={{ transformOrigin: SCARF_PIVOT }}>
            <img src={`${SRC}scarf.webp`} alt="" draggable={false} style={{ transformOrigin: SCARF_PIVOT }} />
          </div>
          <img className="lp-boy" src={`${SRC}boy.webp`} alt="" draggable={false} />
        </div>
        <div className="lp-shade" aria-hidden="true" />

        {/* left: the mark */}
        <div className="lp-brand">
          <div className="lp-kicker"><span className="lp-pulse" />{L.kicker}</div>
          <h1 className="lp-name" aria-label="Celestra">
            {"CELESTRA".split("").map((ch, i) => <span key={i} style={{ animationDelay: `${0.15 + i * 0.07}s` }} aria-hidden="true">{ch}</span>)}
          </h1>
          <svg className="lp-stroke" viewBox="0 0 420 26" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="lpStroke" x1="0" x2="1">
                <stop offset="0" stopColor="#5b9cff" stopOpacity="0" />
                <stop offset="0.25" stopColor="#5b9cff" />
                <stop offset="0.75" stopColor="#a78bff" />
                <stop offset="1" stopColor="#a78bff" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M4 16 C 70 6, 150 22, 230 12 S 360 6, 416 14" />
          </svg>
          <p className="lp-tag">{L.tag}</p>
        </div>

        {/* right: the story */}
        <div className="lp-story">
          {L.chapters.map((c, i) => (
            <article key={i} className="lp-ch" ref={(e) => { chapters.current[i] = e; }}>
              <div className="lp-ch-head"><span className="lp-ch-ic"><BadgeIcon name={c.icon} size={18} /></span><span className="lp-ch-n">0{i + 1} / 0{N}</span></div>
              <div className="lp-eyebrow">{c.eyebrow}</div>
              <h2>{c.title}</h2>
              <p>{c.body}</p>
              {i === N - 1 && (
                <>
                  <dl className="lp-stats">{L.stats.map(([n, s]) => <div key={s}><dt>{n}</dt><dd>{s}</dd></div>)}</dl>
                  <div className="lp-cta">
                    <Link className="btn" to="/dojo">{L.enter} →</Link>
                    <Link className="btn ghost" to="/guide">{L.guide}</Link>
                  </div>
                </>
              )}
            </article>
          ))}
        </div>

        <nav className="lp-rail" aria-label="Chapters">
          {L.chapters.map((c, i) => (
            <button key={i} type="button" ref={(e) => { dots.current[i] = e; }} onClick={() => jump(i)} aria-label={c.eyebrow} data-on={i === 0 ? "1" : "0"}><i /></button>
          ))}
        </nav>
        <div className="lp-cue" aria-hidden="true"><span>{L.scroll}</span><i /></div>
      </div>
    </section>
  );
}
