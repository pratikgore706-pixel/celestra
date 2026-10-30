/** Line icons for the seven mission badges (keys come from the backend). */
const PATHS: Record<string, string> = {
  // First Light: a star burst
  gi: "M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.5 2.5M15.2 15.2l2.5 2.5M6.3 17.7l2.5-2.5M15.2 8.8l2.5-2.5",
  // Storm Chaser: lightning bolt
  yu: "M13 2L4 14h7l-1 8 9-12h-7l1-8z",
  // Mission Planner: calendar with check
  jin: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M9 15l2 2 4-4",
  // Orbit Streak: planet with orbit
  rei: "M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6zM2.5 12c0-2.5 4.3-4.5 9.5-4.5s9.5 2 9.5 4.5-4.3 4.5-9.5 4.5S2.5 14.5 2.5 12z",
  // Data Integrity: shield with check
  makoto: "M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6l8-3zM8.5 12l2.5 2.5 4.5-5",
  // Deep Space: rocket
  meiyo: "M12 2c3 2 5 6 5 10l-2 4H9l-2-4c0-4 2-8 5-10zM12 9.5a1.5 1.5 0 1 0 0 3a1.5 1.5 0 1 0 0-3zM9 16l-2 4 3-1M15 16l2 4-3-1",
  // Full Spectrum: bars
  chugi: "M5 20V12M9.5 20V7M14 20V10M18.5 20V4",
};

export default function BadgeIcon({ name, size = 26 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name] ?? PATHS.gi} />
    </svg>
  );
}
