export default function MatchScoreBadge({ score, rank, className = '' }) {
  const numericScore = Math.round(Number(score) || 0);

  // Dynamic styling based on compatibility score
  let colorStyles = {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    ring: 'ring-emerald-500/20',
    fill: 'text-emerald-600',
    label: 'Exceptional Fit',
  };

  if (numericScore >= 90) {
    colorStyles = {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      ring: 'ring-emerald-500/20',
      fill: 'text-emerald-600',
      label: 'Exceptional Fit',
    };
  } else if (numericScore >= 80) {
    colorStyles = {
      bg: 'bg-teal-50',
      text: 'text-teal-700',
      border: 'border-teal-200',
      ring: 'ring-teal-500/20',
      fill: 'text-teal-600',
      label: 'Strong Match',
    };
  } else if (numericScore >= 70) {
    colorStyles = {
      bg: 'bg-sky-50',
      text: 'text-sky-700',
      border: 'border-sky-200',
      ring: 'ring-sky-500/20',
      fill: 'text-sky-600',
      label: 'Good Match',
    };
  } else {
    colorStyles = {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      ring: 'ring-amber-500/20',
      fill: 'text-amber-600',
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
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
            Fit
          </span>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-1.5">
          {rank && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              #{rank} Ranked
            </span>
          )}
          <span className={`text-xs font-semibold ${colorStyles.text}`}>
            {colorStyles.label}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">Lifestyle & preference compatibility</p>
      </div>
    </div>
  );
}
