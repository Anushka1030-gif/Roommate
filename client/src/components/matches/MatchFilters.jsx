export default function MatchFilters({
  activeTab = 'all',
  onTabChange,
  counts = {},
  sortBy = 'score',
  onSortChange,
  searchQuery = '',
  onSearchChange,
  lifestyleFilter = 'all',
  onLifestyleFilterChange,
}) {
  const tabs = [
    { id: 'all', label: 'All Matches', count: counts.all || 0 },
    { id: 'suggested', label: 'Suggested', count: counts.suggested || 0 },
    { id: 'liked', label: 'Liked', count: counts.liked || 0, icon: '❤️' },
    { id: 'connected', label: 'Connected', count: counts.connected || 0, icon: '💬' },
    { id: 'skipped', label: 'Skipped', count: counts.skipped || 0, icon: '👁️‍🗨️' },
  ];

  return (
    <div className="space-y-4">
      {/* Status tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl overflow-x-auto scrollbar-none border border-slate-200/60">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              {tab.icon && <span className="text-xs">{tab.icon}</span>}
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive
                    ? 'bg-teal-50 text-teal-700'
                    : 'bg-slate-200/70 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Secondary filter & search row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name or college..."
            aria-label="Search matches by name or college"
            className="w-full pl-9 pr-4 py-2 text-xs bg-white rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2">
          {/* Quick Lifestyle Filter */}
          <select
            value={lifestyleFilter}
            onChange={(e) => onLifestyleFilterChange(e.target.value)}
            aria-label="Filter by lifestyle preference"
            className="px-3 py-2 text-xs font-medium bg-white rounded-xl border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-2xs cursor-pointer"
          >
            <option value="all">All Lifestyles</option>
            <option value="early_bird">Early Bird</option>
            <option value="night_owl">Night Owl</option>
            <option value="clean_high">Cleanliness 4+</option>
            <option value="veg">Vegetarian</option>
            <option value="non_smoker">Non-Smoker</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            aria-label="Sort matches by criteria"
            className="px-3 py-2 text-xs font-medium bg-white rounded-xl border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-2xs cursor-pointer"
          >
            <option value="score">Sort: Highest Match</option>
            <option value="cleanliness">Sort: Cleanest First</option>
            <option value="age">Sort: Age</option>
          </select>
        </div>
      </div>
    </div>
  );
}
