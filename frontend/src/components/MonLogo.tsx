/** Celestra mark: a planet with a tilted orbit and a satellite on it. */
export default function MonLogo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="7.2" fill="var(--accent, #5b9cff)" />
      <circle cx="13.8" cy="13.6" r="2.4" fill="#ffffff" fillOpacity="0.28" />
      <ellipse cx="16" cy="16" rx="14" ry="5.2" fill="none" stroke="var(--paper, #e7ecf5)" strokeOpacity="0.85" strokeWidth="1.3" transform="rotate(-24 16 16)" />
      <circle cx="28.4" cy="10.4" r="1.9" fill="var(--paper, #e7ecf5)" />
    </svg>
  );
}
