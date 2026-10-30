import L from "leaflet";
import { BAND_HEX } from "../lib/format";

/** Flat silhouette markers: what the place really is, coloured by score band. */
export const GLYPH: Record<string, string> = {
  viewpoint: '<circle cx="9" cy="16" r="4.5"/><circle cx="19" cy="16" r="4.5"/><rect x="7" y="8" width="4" height="6"/><rect x="17" y="8" width="4" height="6"/><rect x="11" y="12" width="6" height="3"/>',
  peak: '<path d="M3 21 L11 7 L15 13 L18 10 L25 21Z"/>',
  shrine: '<path d="M4 11 L14 5 L24 11Z"/><rect x="6" y="19" width="16" height="2"/><rect x="7" y="12" width="2" height="7"/><rect x="13" y="12" width="2" height="7"/><rect x="19" y="12" width="2" height="7"/>',
  observatory: '<path d="M6 10 L14 5 L22 10Z M8 15 L14 11 L20 15Z M10 20 L14 17 L18 20Z"/><rect x="13" y="8" width="2" height="14"/>',
  park: '<circle cx="14" cy="10" r="6"/><rect x="13" y="14" width="2" height="7"/>',
  here: '<circle cx="14" cy="13" r="5"/><circle cx="14" cy="13" r="9" fill="none" stroke-width="2"/>',
};

export function spotIcon(type: string, band: string, selected = false, rank?: number) {
  const c = BAND_HEX[band] ?? "#93a0b8";
  const ring = selected ? "#e7ecf5" : "#070c16";
  const g = GLYPH[type] ?? GLYPH.park;
  const badge = rank ? `<text x="27" y="8" font-size="8" font-family="Roboto Mono, monospace" fill="#e7ecf5" text-anchor="end">${rank}</text>` : "";
  const html = `<svg width="34" height="34" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="26" height="26" rx="2" fill="#070c16" stroke="${ring}" stroke-width="${selected ? 2 : 1}"/>
    <g fill="${c}" stroke="${c}">${g}</g>${badge}</svg>`;
  return L.divIcon({ html, className: "spot-icon", iconSize: [34, 34], iconAnchor: [17, 17] });
}
