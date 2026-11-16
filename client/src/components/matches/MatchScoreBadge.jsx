export default function MatchScoreBadge({ score, rank, className = '' }) {
  const numericScore = Math.round(Number(score) || 0);

  // Dynamic styling based on compatibility score using peach tints (higher = deeper peach)
  let colorStyles = {
    bg: 'bg-peach-soft',
    text: 'text-text-primary',
    border: 'border-peach/50',
    ring: 'ring-peach-soft/40',
    label: 'Good Match',
  };

  if (numericScore >= 90) {
    colorStyles = {
      bg: 'bg-peach',
      text: 'text-text-primary font-bold',
      border: 'border-peach-deep',
      ring: 'ring-peach-deep/30',
      label: 'Exceptional Fit',
    };
  } else if (numericScore >= 80) {
    colorStyles = {
      bg: 'bg-peach/70',
      text: 'text-text-primary',
      border: 'border-peach',
      ring: 'ring-peach/30',
      label: 'Strong Match',
    };
  } else if (numericScore >= 70) {
    colorStyles = {
      bg: 'bg-peach-soft',
      text: 'text-text-primary',
      border: 'border-peach/50',
      ring: 'ring-peach-soft/40',
      label: 'Good Match',
    };
  } else {
    colorStyles = {
      bg: 'bg-beige',
      text: 'text-text-primary',
      border: 'border-surface-border',
      ring: 'ring-beige/40',
      label: 'Moderate Match',
    };
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Visual Circular Gauge / Score Badge */}
      <div
        className={`relative flex items-center justify-center w-14 h-14 rounded-2xl ${colorStyles.bg} border ${colorStyles.border} shadow-xs ring-2 ${colorStyles.ring} transition-transform duration-200 hover:scale-105`}
        title={`Compatibility Score: ${numericScore}%`}
      >
        <div className="flex flex-col items-center justify-center leading-none">
          <span className={`text-base font-extrabold tracking-tight ${colorStyles.text}`}>
            {numericScore}%
          </span>
          <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mt-0.5">
            Fit
          </span>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-1.5">
          {rank && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-beige text-text-primary border border-surface-border">
              #{rank} Ranked
            </span>
          )}
          <span className={`text-xs font-semibold ${colorStyles.text}`}>
            {colorStyles.label}
          </span>
        </div>
        <p className="text-xs text-text-secondary mt-0.5">Lifestyle & preference compatibility</p>
      </div>
    </div>
  );
}
