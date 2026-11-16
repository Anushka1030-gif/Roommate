const DIMENSION_CONFIG = {
  cleanliness: { label: 'Cleanliness Compatibility', icon: '✨' },
  sleep: { label: 'Sleep & Quiet Hours', icon: '🌙' },
  budget: { label: 'Budget Alignment', icon: '💰' },
  noise: { label: 'Noise Tolerance', icon: '🎧' },
  food: { label: 'Diet & Kitchen Fit', icon: '🥗' },
  habits: { label: 'Study & Daily Habits', icon: '📚' },
  social: { label: 'Social & Interaction Style', icon: '🤝' },
  guests: { label: 'Guest & Visitor Policy', icon: '🚪' },
  smoking: { label: 'Smoking Habits', icon: '🚭' },
  drinking: { label: 'Drinking Habits', icon: '🍹' },
};

export default function ScoreBreakdownBars({ breakdown = {}, className = '' }) {
  const entries = Object.entries(breakdown).filter(([key]) => DIMENSION_CONFIG[key]);

  if (entries.length === 0) {
    return null;
  }

  const getScoreColor = (val) => {
    if (val >= 90) return 'bg-peach-deep';
    if (val >= 75) return 'bg-peach';
    if (val >= 60) return 'bg-peach-soft';
    return 'bg-beige-400';
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
        {entries.map(([key, rawValue]) => {
          const val = Math.round(Number(rawValue) || 0);
          const config = DIMENSION_CONFIG[key] || { label: key, icon: '•' };

          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-secondary flex items-center gap-1.5 font-medium truncate">
                  <span className="text-sm">{config.icon}</span>
                  <span className="truncate">{config.label}</span>
                </span>
                <span className="font-semibold text-text-primary tabular-nums ml-2">
                  {val}%
                </span>
              </div>
              <div className="w-full bg-beige rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getScoreColor(val)}`}
                  style={{ width: `${Math.min(100, Math.max(0, val))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
