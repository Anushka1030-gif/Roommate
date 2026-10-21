const LABELS = {
  sleep_schedule: {
    early_bird: 'Early Bird (wakes early)',
    night_owl: 'Night Owl (late nights)',
    flexible: 'Flexible Schedule',
  },
  study_habits: {
    silent: 'Silent & Deep Focus',
    background_noise: 'Ambient Noise OK',
    group_study: 'Group Study Friendly',
    flexible: 'Adaptable Study Routine',
    mostly_home: 'Studies at Home',
    mix: 'Mix of Home & Library',
    mostly_out: 'Studies Outside/Library',
  },
  noise_level: {
    quiet: 'Prefers Quiet',
    moderate: 'Moderate Noise OK',
    lively: 'Lively & Energetic',
  },
  food_preference: {
    vegetarian: 'Vegetarian',
    eggetarian: 'Eggetarian',
    non_vegetarian: 'Non-Vegetarian',
    vegan: 'Vegan',
    no_preference: 'Any Food Habit',
  },
  smoking_preference: {
    never: 'Non-Smoker',
    no: 'Non-Smoker',
    occasionally: 'Social Smoker',
    regularly: 'Smoker',
  },
  drinking_preference: {
    never: 'Non-Drinker',
    no: 'Non-Drinker',
    occasionally: 'Social Drinker',
    socially: 'Social Drinker',
    regularly: 'Regular Drinker',
  },
  guest_policy: {
    rarely: 'Rarely Guests',
    sometimes: 'Occasional Visitors',
    often: 'Frequent Guests OK',
  },
};

export default function MatchLifestyleSummary({ user = {}, className = '' }) {
  const cleanliness = Number(user.cleanliness_level || 3);

  const sleepLabel = LABELS.sleep_schedule[user.sleep_schedule] || user.sleep_schedule || 'Flexible';
  const studyLabel = LABELS.study_habits[user.study_habits] || user.study_habits || 'Adaptable';
  const noiseLabel = LABELS.noise_level[user.noise_level] || user.noise_level || 'Moderate';
  const foodLabel = LABELS.food_preference[user.food_preference] || user.food_preference || 'Flexible';
  const smokeLabel = LABELS.smoking_preference[user.smoking_preference] || 'Non-Smoker';
  const drinkLabel = LABELS.drinking_preference[user.drinking_preference] || 'Non-Drinker';
  const guestLabel = LABELS.guest_policy[user.guest_policy] || 'Occasional Visitors';

  return (
    <div className={`space-y-3 ${className}`}>
      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        Lifestyle & Habit Overview
      </h4>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {/* Cleanliness */}
        <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 text-xs">
          <span className="text-slate-500 block text-[11px]">Cleanliness</span>
          <div className="flex items-center gap-1 mt-0.5 font-medium text-slate-800">
            <span>Level {cleanliness}/5</span>
            <div className="flex gap-0.5 ml-1">
              {[1, 2, 3, 4, 5].map((lvl) => (
                <div
                  key={lvl}
                  className={`w-1.5 h-1.5 rounded-full ${
                    lvl <= cleanliness ? 'bg-teal-600' : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Sleep */}
        <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 text-xs">
          <span className="text-slate-500 block text-[11px]">Sleep Schedule</span>
          <span className="font-medium text-slate-800 truncate block mt-0.5" title={sleepLabel}>
            {sleepLabel}
          </span>
        </div>

        {/* Study Habits */}
        <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 text-xs">
          <span className="text-slate-500 block text-[11px]">Study Routine</span>
          <span className="font-medium text-slate-800 truncate block mt-0.5" title={studyLabel}>
            {studyLabel}
          </span>
        </div>

        {/* Noise Tolerance */}
        <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 text-xs">
          <span className="text-slate-500 block text-[11px]">Noise Level</span>
          <span className="font-medium text-slate-800 truncate block mt-0.5" title={noiseLabel}>
            {noiseLabel}
          </span>
        </div>

        {/* Food */}
        <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 text-xs">
          <span className="text-slate-500 block text-[11px]">Dietary Habit</span>
          <span className="font-medium text-slate-800 truncate block mt-0.5" title={foodLabel}>
            {foodLabel}
          </span>
        </div>

        {/* Guests */}
        <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 text-xs">
          <span className="text-slate-500 block text-[11px]">Guests & Visitors</span>
          <span className="font-medium text-slate-800 truncate block mt-0.5" title={guestLabel}>
            {guestLabel}
          </span>
        </div>

        {/* Smoking & Drinking */}
        <div className="col-span-2 sm:col-span-3 p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 text-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-[11px]">Smoking: </span>
            <span className="font-medium text-slate-800">{smokeLabel}</span>
          </div>
          <span className="text-slate-300">•</span>
          <div>
            <span className="text-slate-500 text-[11px]">Drinking: </span>
            <span className="font-medium text-slate-800">{drinkLabel}</span>
          </div>
          {user.pet_preference && (
            <>
              <span className="text-slate-300">•</span>
              <div>
                <span className="text-slate-500 text-[11px]">Pets: </span>
                <span className="font-medium text-slate-800 capitalize">
                  {user.pet_preference.replace('_', ' ')}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
