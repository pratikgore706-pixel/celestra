import { Area, AreaChart, CartesianGrid, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Score } from "../api/types";
import { useI18n } from "../i18n/I18n";
import { fmtHour, fmtTime } from "../lib/format";

export default function HonorCurve({ score, height = 220 }: { score: Score; height?: number }) {
  const { lang, t } = useI18n();
  const data = score.hours.map((h) => ({ ...h, x: h.t }));
  const w = score.window;
  // The window's end is one hour past its last sample; shade the sampled hours.
  const wEnd = w ? data.filter((d) => d.x >= w.start && d.x < w.end).at(-1)?.x : undefined;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 24, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#5b9cff" fillOpacity="0.10" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#5b9cff" strokeOpacity="0.25" strokeWidth="2" />
          </pattern>
        </defs>
        <CartesianGrid stroke="#2e2a3a" vertical={false} />
        <XAxis dataKey="x" tickFormatter={(v) => fmtHour(v, lang)} tick={{ fill: "#93a0b8", fontSize: 11 }} stroke="#26324a" interval="preserveStartEnd" minTickGap={18} />
        <YAxis domain={[0, 100]} ticks={[0, 40, 60, 80, 100]} tick={{ fill: "#93a0b8", fontSize: 11 }} stroke="#26324a" />
        {w && wEnd && <ReferenceArea x1={w.start} x2={wEnd} fill="url(#hatch)" stroke="#5b9cff" strokeOpacity={0.6} label={{ value: t("watch.best"), fill: "#5b9cff", fontSize: 11, position: "top" }} />}
        <Tooltip
          contentStyle={{ background: "#0b111c", border: "1px solid #26324a", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#efe6d4" }}
          labelFormatter={(v) => fmtTime(String(v), lang)}
          formatter={(v: number) => [Math.round(v), t("watch.score")]}
        />
        <Area type="monotone" dataKey="score" stroke="#5b9cff" strokeWidth={2} fill="#5b9cff" fillOpacity={0.08} dot={{ r: 2, fill: "#5b9cff" }} activeDot={{ r: 4 }} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
