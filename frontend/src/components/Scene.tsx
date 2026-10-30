/**
 * Page header art for the mission theme: deep-space gradient, a seeded starfield,
 * a planet limb with atmospheric glow along the bottom edge and a per-page motif
 * (satellite pass, ground-station dish, orbital paths, spiral galaxy, constellation).
 */
export type SceneVariant = "dojo" | "watchtower" | "scroll" | "lens" | "guide";

const W = 1440, H = 240;

const TINT: Record<SceneVariant, string> = {
  dojo: "#2a5bd7", watchtower: "#1f7a8c", scroll: "#5a49c9", lens: "#7a3fb8", guide: "#2a6fc9",
};

function rand(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

function Stars({ seed }: { seed: number }) {
  const r = rand(seed);
  const pts = Array.from({ length: 140 }, () => ({ x: r() * W, y: r() * 200, s: r() < 0.08 ? 1.4 : r() < 0.4 ? 0.9 : 0.55, o: 0.25 + r() * 0.65 }));
  return <g fill="#dfe8ff">{pts.map((p, i) => <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={p.s} opacity={p.o.toFixed(2)} />)}</g>;
}

function Motif({ v, x }: { v: SceneVariant; x: number }) {
  const line = { fill: "none", stroke: "#a9c4ff", strokeWidth: 1 } as const;
  switch (v) {
    case "dojo":
      return (
        <g>
          <path d={`M${x - 360} 150 Q ${x} 40 ${x + 260} 110`} {...line} strokeOpacity="0.35" strokeDasharray="3 6" />
          <g transform={`translate(${x + 40} 78) rotate(-18)`}>
            <rect x="-6" y="-5" width="12" height="10" rx="1.5" fill="#cfdcf5" />
            <rect x="-34" y="-3.5" width="24" height="7" fill="#3d6fd8" stroke="#a9c4ff" strokeWidth="0.6" />
            <rect x="10" y="-3.5" width="24" height="7" fill="#3d6fd8" stroke="#a9c4ff" strokeWidth="0.6" />
            <line x1="0" y1="5" x2="0" y2="11" stroke="#cfdcf5" strokeWidth="1" />
          </g>
        </g>
      );
    case "watchtower":
      return (
        <g transform={`translate(${x} 196)`} fill="#070b14" stroke="#5b7fb8" strokeWidth="0.8">
          <path d="M-46 -40 A 52 52 0 0 0 46 -40 L 0 -16 Z" transform="rotate(-28)" />
          <path d="M-6 -16 L-14 22 L14 22 L6 -16 Z" />
          <line x1="0" y1="-30" x2="-18" y2="-62" stroke="#8fb0e8" />
          <circle cx="-18" cy="-62" r="2.4" fill="#8fb0e8" stroke="none" />
          <path d="M-24 -78 a 10 10 0 0 1 14 -2 M-28 -84 a 16 16 0 0 1 22 -3" fill="none" stroke="#5b9cff" strokeOpacity="0.7" />
        </g>
      );
    case "scroll":
      return (
        <g>
          {[0, 1, 2].map((i) => (
            <ellipse key={i} cx={x} cy={96} rx={90 + i * 70} ry={22 + i * 15} {...line} strokeOpacity={0.32 - i * 0.07} transform={`rotate(-8 ${x} 96)`} />
          ))}
          <circle cx={x} cy={96} r={11} fill="#ffcf7a" />
          <circle cx={x} cy={96} r={20} fill="#ffcf7a" opacity="0.12" />
          <circle cx={x + 88} cy={88} r={4} fill="#8bbaff" />
          <circle cx={x - 150} cy={112} r={5.5} fill="#c39bff" />
          <circle cx={x + 218} cy={70} r={3.5} fill="#e7ecf5" />
        </g>
      );
    case "lens":
      return (
        <g transform={`translate(${x} 92) rotate(-22)`}>
          <ellipse rx="120" ry="34" fill="url(#gal)" />
          {[0, 1].map((k) => (
            <path key={k} d="M0 0 C 30 -24 80 -20 110 4 M0 0 C -30 24 -80 20 -110 -4" fill="none" stroke="#d8c6ff" strokeOpacity={0.35 - k * 0.15} strokeWidth={2 - k} transform={`scale(${1 - k * 0.35})`} />
          ))}
          <circle r="7" fill="#fff4dc" />
        </g>
      );
    case "guide": {
      const pts: [number, number][] = [[x - 220, 120], [x - 150, 74], [x - 70, 92], [x, 52], [x + 90, 70], [x + 160, 40], [x + 120, 120]];
      return (
        <g>
          <polyline points={pts.slice(0, 6).map((p) => p.join(",")).join(" ")} {...line} strokeOpacity="0.4" />
          <line x1={pts[4][0]} y1={pts[4][1]} x2={pts[6][0]} y2={pts[6][1]} {...line} strokeOpacity="0.4" />
          {pts.map(([a, b], i) => <circle key={i} cx={a} cy={b} r={i === 3 ? 3.2 : 2.2} fill="#e7ecf5" />)}
        </g>
      );
    }
  }
}

export default function Scene({ variant, moonX = 1180 }: { variant: SceneVariant; moonX?: number }) {
  const tint = TINT[variant];
  const seed = { dojo: 11, watchtower: 23, scroll: 37, lens: 41, guide: 53 }[variant];
  return (
    <svg className="art" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" role="img" aria-hidden="true">
      <defs>
        <linearGradient id={`sky-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#03060c" />
          <stop offset="0.7" stopColor="#070d1a" />
          <stop offset="1" stopColor="#0b1426" />
        </linearGradient>
        <radialGradient id={`neb-${variant}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={tint} stopOpacity="0.30" />
          <stop offset="1" stopColor={tint} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`limb-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7fb2ff" stopOpacity="0.38" />
          <stop offset="0.015" stopColor="#2f5fb8" stopOpacity="0.22" />
          <stop offset="0.06" stopColor="#0c1730" />
          <stop offset="0.25" stopColor="#08101f" />
          <stop offset="1" stopColor="#050912" />
        </linearGradient>
        <radialGradient id="gal" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#f3e6ff" stopOpacity="0.55" />
          <stop offset="0.4" stopColor="#9b7bff" stopOpacity="0.18" />
          <stop offset="1" stopColor="#9b7bff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#sky-${variant})`} />
      <ellipse cx={moonX - 220} cy={70} rx={520} ry={150} fill={`url(#neb-${variant})`} />
      <Stars seed={seed} />
      <Motif v={variant} x={moonX} />
      {/* planet limb */}
      <ellipse cx={W / 2} cy={H + 1180} rx={1700} ry={1240} fill="#5b9cff" opacity="0.05" />
      <ellipse cx={W / 2} cy={H + 1185} rx={1680} ry={1228} fill={`url(#limb-${variant})`} />
    </svg>
  );
}
