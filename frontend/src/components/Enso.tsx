import type { ReactNode } from "react";

/**
 * Score ring: a fine full circle with a gold arc. With `value` (0–100) the arc
 * shows that share of the ring; without it, a three-quarter arc (decorative / loading).
 */
export default function Enso({ size = 120, color = "var(--gold)", value, children }: {
  size?: number; color?: string; value?: number; children?: ReactNode;
}) {
  const r = 46, c = 2 * Math.PI * r;
  const frac = value == null ? 0.75 : Math.max(0.02, Math.min(1, value / 100));
  return (
    <div className="enso" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--ring-track)" strokeWidth="1.6" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round"
          strokeDasharray={`${(c * frac).toFixed(1)} ${c.toFixed(1)}`} transform="rotate(-90 50 50)" />
      </svg>
      <div className="enso-in">{children}</div>
    </div>
  );
}
