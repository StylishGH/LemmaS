export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`lemmas-logo ${compact ? "lemmas-logo-compact" : ""}`} aria-label="LEMMAS">
      <span className="lemmas-logo-chalk">Lem</span>
      <span className="lemmas-logo-divider" aria-hidden="true" />
      <span className="lemmas-logo-marker">maS</span>
    </div>
  );
}
