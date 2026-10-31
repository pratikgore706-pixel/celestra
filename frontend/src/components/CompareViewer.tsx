import { useCallback, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import type { LensResult, Source } from "../api/types";

export const KIND_COLOR: Record<string, string> = {
  star: "#5b9cff", bright_star: "#ffffff", galaxy: "#c39bff", nebula: "#ffb547", band: "#ffb547",
  cluster: "#3ddc97", trail: "#ff5d5d", known: "#5ee0ff", hot: "#ff5d5d", fuzzy: "#93a0b8",
};
export const DEFAULT_LAYERS = ["star", "bright_star", "galaxy", "nebula", "cluster", "trail", "known", "hot"];
export const kindOf = (s: Source) => s.kind ?? (s.class === "star" ? "star" : "galaxy");
import { useI18n } from "../i18n/I18n";
import { apiUrl } from "../api/client";

/**
 * Before/after viewer. Both images and the overlay share one transform, so zoom and pan
 * move them together; the split line stays in screen space.
 */
export default function CompareViewer({ r, overlay, mist, selected, onSelect, maxHeight = 560, layers }: {
  r: LensResult; overlay: boolean; mist: boolean; selected: number | null;
  onSelect?: (id: number) => void; maxHeight?: number; layers?: Set<string>;
}) {
  const { t } = useI18n();
  const box = useRef<HTMLDivElement>(null);
  const [split, setSplit] = useState(0.5);
  const [z, setZ] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ mode: "split" | "pan"; x: number; y: number; px: number; py: number } | null>(null);

  const clampPan = useCallback((p: { x: number; y: number }, zoom: number) => {
    const el = box.current; if (!el) return p;
    const w = el.clientWidth, h = el.clientHeight;
    return { x: Math.min(0, Math.max(w * (1 - zoom), p.x)), y: Math.min(0, Math.max(h * (1 - zoom), p.y)) };
  }, []);

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const el = box.current!; const rect = el.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    const nz = Math.min(12, Math.max(1, z * (e.deltaY < 0 ? 1.2 : 1 / 1.2)));
    const np = { x: cx - (cx - pan.x) * (nz / z), y: cy - (cy - pan.y) * (nz / z) };
    setZ(nz); setPan(clampPan(np, nz));
  };
  const zoomBy = (f: number) => {
    const el = box.current!; const cx = el.clientWidth / 2, cy = el.clientHeight / 2;
    const nz = Math.min(12, Math.max(1, z * f));
    setZ(nz); setPan(clampPan({ x: cx - (cx - pan.x) * (nz / z), y: cy - (cy - pan.y) * (nz / z) }, nz));
  };
  const down = (e: PointerEvent, mode: "split" | "pan") => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = { mode, x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
  };
  const move = (e: PointerEvent) => {
    const d = drag.current; if (!d) return;
    const rect = box.current!.getBoundingClientRect();
    if (d.mode === "split") setSplit(Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)));
    else if (z > 1) setPan(clampPan({ x: d.px + e.clientX - d.x, y: d.py + e.clientY - d.y }, z));
    else setSplit(Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)));
  };
  const up = () => { drag.current = null; };

  const tf = { transform: `translate(${pan.x}px, ${pan.y}px) scale(${z})` };
  const right = mist ? r.files.mist : r.files.restored;
  const invented = r.seal.invented ?? [];

  return (
    <div>
      <div
        ref={box} className="cv" style={{ aspectRatio: `${r.width} / ${r.height}`, maxHeight, cursor: z > 1 ? "grab" : "ew-resize" }}
        onWheel={onWheel} onPointerDown={(e) => down(e, "pan")} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        role="slider" aria-label="Compare original and restored" aria-valuenow={Math.round(split * 100)} aria-valuemin={0} aria-valuemax={100} tabIndex={0}
        onKeyDown={(e) => { if (e.key === "ArrowLeft") setSplit((s) => Math.max(0, s - 0.05)); if (e.key === "ArrowRight") setSplit((s) => Math.min(1, s + 0.05)); }}
      >
        <div className="cv-layer" style={tf}><img src={apiUrl(r.files.original)} alt={t("lens.orig")} draggable={false} /></div>
        <div className="cv-clip" style={{ clipPath: `inset(0 0 0 ${split * 100}%)` }}>
          <div className="cv-layer" style={tf}><img src={apiUrl(right)} alt={mist ? t("lens.mistlabel") : t("lens.rest")} draggable={false} /></div>
        </div>
        <div className="cv-layer" style={{ ...tf, pointerEvents: "none" }}>
          <svg viewBox={`0 0 ${r.width} ${r.height}`} preserveAspectRatio="none" className="cv-svg">
            {overlay && <Entities r={r} layers={layers ?? new Set(DEFAULT_LAYERS)} />}
            {overlay && r.sources.filter((s) => s.id === selected || ((layers ?? new Set(DEFAULT_LAYERS)).has(kindOf(s))
                && !(kindOf(s) === "nebula" && ((r.analysis?.regions.length ?? 0) > 0 || (r.analysis?.field?.objects.length ?? 0) > 0))))
              .map((s) => <Mark key={s.id} s={s} sel={s.id === selected} onSelect={onSelect} fs={r.width / 62} />)}
            {invented.map((p, i) => (
              <g key={`inv${i}`}>
                <circle cx={p.x} cy={p.y} r={10} className="mk-invented" vectorEffect="non-scaling-stroke" />
                <text x={p.x + 13} y={p.y + 4} className="mk-label">INVENTED</text>
              </g>
            ))}
          </svg>
        </div>
        <div className="cv-handle" style={{ left: `${split * 100}%` }} onPointerDown={(e) => down(e, "split")}><span>◀ ▶</span></div>
        <span className="cv-tag" style={{ left: 8 }}>{t("lens.orig")}</span>
        <span className="cv-tag" style={{ right: 8 }}>{mist ? t("lens.mistlabel") : t("lens.rest")}</span>
      </div>
      <div className="row small" style={{ marginTop: 8, justifyContent: "space-between" }}>
        <div className="row">
          <button className="btn ghost sm" onClick={() => zoomBy(1.5)} aria-label="Zoom in">+</button>
          <button className="btn ghost sm" onClick={() => zoomBy(1 / 1.5)} aria-label="Zoom out">−</button>
          <button className="btn ghost sm" onClick={() => { setZ(1); setPan({ x: 0, y: 0 }); }}>{t("lens.reset")}</button>
          <span className="mono faint">{z.toFixed(1)}×</span>
        </div>
        <span className="faint">{t("lens.processed")}</span>
      </div>
    </div>
  );
}

function Entities({ r, layers }: { r: LensResult; layers: Set<string> }) {
  const { t } = useI18n();
  const A = r.analysis;
  if (!A) return null;
  const fs = r.width / 62;
  const label = (x: number, y: number, txt: string, c: string, anchor: "start" | "middle" = "start") => (
    <text x={x} y={y} fill={c} fontSize={fs} className="mk-name" textAnchor={anchor}>{txt}</text>
  );
  return (
    <g>
      {layers.has("nebula") && A.regions.map((g, i) => (
        <g key={`rg${i}`}>
          <ellipse cx={g.x} cy={g.y} rx={g.a} ry={g.b} transform={`rotate(${g.angle} ${g.x} ${g.y})`} className="mk-region" vectorEffect="non-scaling-stroke" />
          {label(g.x, g.y - g.b * 0.2, t(g.kind === "band" ? "lbl.band" : "lbl.nebula"), KIND_COLOR.nebula, "middle")}
        </g>
      ))}
      {layers.has("cluster") && A.clusters.map((c, i) => (
        <g key={`cl${i}`}>
          <circle cx={c.x} cy={c.y} r={c.r} className="mk-cluster" vectorEffect="non-scaling-stroke" />
          {label(c.x + c.r * 0.72, c.y - c.r * 0.72, t("lbl.cluster").replace("{n}", String(c.n)), KIND_COLOR.cluster)}
        </g>
      ))}
      {layers.has("trail") && A.trails.map((l, i) => (
        <g key={`tr${i}`}>
          <line x1={l.x0} y1={l.y0} x2={l.x1} y2={l.y1} className="mk-trail" vectorEffect="non-scaling-stroke" />
          {label((l.x0 + l.x1) / 2, (l.y0 + l.y1) / 2 - fs * 0.8, t("lbl.trail"), KIND_COLOR.trail, "middle")}
        </g>
      ))}
      {layers.has("hot") && A.repairs.hot_pixels.pts.map(([x, y], i) => (
        <rect key={`hp${i}`} x={x - 3} y={y - 3} width={6} height={6} className="mk-hot" vectorEffect="non-scaling-stroke" />
      ))}
      {layers.has("known") && A.field?.objects.map((o, i) => {
        const rr = Math.max(o.r, fs * 1.6);
        const big = rr > 0.3 * Math.min(r.width, r.height);
        const name = `${o.id}${o.name ? ` · ${o.name}` : ""}`;
        if (big) {
          // larger than the frame: outline it and pin the name where it is readable
          const lx = Math.min(Math.max(o.x, fs * 8), r.width - fs * 8), ly = Math.min(Math.max(o.y - fs * 1.3, fs * 2), r.height - fs * 2) + i * fs * 1.6;
          return (
            <g key={o.id}>
              <circle cx={o.x} cy={o.y} r={rr} className="mk-known big" vectorEffect="non-scaling-stroke" />
              <circle cx={Math.min(Math.max(o.x, 0), r.width)} cy={Math.min(Math.max(o.y, 0), r.height)} r={fs * 0.45} fill={KIND_COLOR.known} />
              <text x={lx} y={ly} fill={KIND_COLOR.known} fontSize={fs * 1.2} className="mk-name strong" textAnchor="middle">{name}</text>
            </g>
          );
        }
        return (
          <g key={o.id}>
            <circle cx={o.x} cy={o.y} r={rr} className="mk-known" vectorEffect="non-scaling-stroke" />
            <line x1={o.x + rr * 0.7} y1={o.y - rr * 0.7} x2={o.x + rr * 0.7 + fs} y2={o.y - rr * 0.7 - fs} className="mk-known" vectorEffect="non-scaling-stroke" />
            <text x={o.x + rr * 0.7 + fs * 1.2} y={o.y - rr * 0.7 - fs * 1.1} fill={KIND_COLOR.known} fontSize={fs * 1.15} className="mk-name strong">{name}</text>
          </g>
        );
      })}
    </g>
  );
}

function Mark({ s, sel, onSelect, fs }: { s: Source; sel: boolean; onSelect?: (id: number) => void; fs: number }) {
  const { t } = useI18n();
  const k = kindOf(s);
  const c = KIND_COLOR[k] ?? KIND_COLOR.star;
  const cls = `mk ${sel ? "mk-sel" : ""}`;
  const handle = onSelect ? { onPointerDown: (e: PointerEvent) => { e.stopPropagation(); onSelect(s.id); }, style: { pointerEvents: "all" as const, cursor: "pointer", stroke: sel ? undefined : c } } : { style: { stroke: sel ? undefined : c } };
  if (k === "trail" && !sel) return null; // drawn as whole lines
  if (k === "galaxy" || k === "nebula" || k === "fuzzy") {
    const a = Math.max(Math.sqrt(s.area / Math.PI) * 1.4, 6);
    const b = a * Math.max(1 - s.ellipticity, 0.35);
    return (
      <g>
        <ellipse cx={s.x} cy={s.y} rx={a} ry={b} transform={`rotate(${s.orientation} ${s.x} ${s.y})`} className={`${cls} mk-ext`} vectorEffect="non-scaling-stroke" {...handle} />
        {k === "galaxy" && <text x={s.x + a + 3} y={s.y + fs * 0.35} fill={c} fontSize={fs * 0.9} className="mk-name">{t("lbl.galaxy")}</text>}
      </g>
    );
  }
  const r = Math.max(s.fwhm * 1.6, 4);
  if (k === "bright_star") {
    const q = r * 1.9;
    return (
      <g>
        <circle cx={s.x} cy={s.y} r={r} className={cls} vectorEffect="non-scaling-stroke" {...handle} />
        <path d={`M${s.x - q} ${s.y}H${s.x - r}M${s.x + r} ${s.y}H${s.x + q}M${s.x} ${s.y - q}V${s.y - r}M${s.x} ${s.y + r}V${s.y + q}`} className="mk" style={{ stroke: c }} vectorEffect="non-scaling-stroke" />
      </g>
    );
  }
  return <circle cx={s.x} cy={s.y} r={r} className={cls} vectorEffect="non-scaling-stroke" {...handle} />;
}
