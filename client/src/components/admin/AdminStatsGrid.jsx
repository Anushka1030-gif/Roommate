import Card from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';

export default function AdminStatsGrid({ stats, loading = false }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        <div className="col-span-full h-32 bg-slate-100 rounded-2xl" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-100 rounded-2xl" />
        ))}
      </div>
    );
  }

  const {
    total_users = 0,
    verified_users = 0,
    completed_profiles = 0,
    active_requirements = 0,
    conversations = 0,
    contact_share_agreements = 0,
    confirmed_roommate_pairs = 0,
  } = stats || {};

  return (
    <div className="space-y-4">
      {/* North-Star Metric Highlight Card */}
      <div
        data-testid="north-star-card"
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-6 sm:p-8 text-white shadow-lg shadow-teal-700/20 border border-teal-500/30"
      >
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center p-1.5 rounded-lg bg-white/20 text-white backdrop-blur-xs">
                <svg className="w-5 h-5 text-amber-300 fill-amber-300" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </span>
              <span className="text-xs uppercase tracking-wider font-semibold text-teal-100">
                North-Star Metric
              </span>
              <Badge variant="success" size="sm" className="bg-emerald-400/20 text-emerald-100 border-emerald-300/30">
                Core Goal
              </Badge>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Confirmed Roommate Pairs
            </h2>
            <p className="text-xs sm:text-sm text-teal-100 max-w-xl">
              Students who successfully found a compatible match, agreed on terms, and both confirmed each other as roommates.
            </p>
          </div>

          <div className="flex items-baseline gap-2 sm:text-right shrink-0">
            <span
              data-testid="confirmed-roommate-pairs-count"
              className="text-4xl sm:text-5xl font-black tracking-tight text-white font-mono"
            >
              {confirmed_roommate_pairs}
            </span>
            <span className="text-teal-200 text-sm font-medium">pairs</span>
          </div>
        </div>
      </div>

      {/* Supporting Platform Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Users */}
        <Card className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Users</span>
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div>
            <div data-testid="stat-total-users" className="text-2xl font-bold text-slate-900 font-mono">
              {total_users}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Registered accounts</p>
          </div>
        </Card>

        {/* Verified Students */}
        <Card className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Verified</span>
            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <div data-testid="stat-verified-users" className="text-2xl font-bold text-slate-900 font-mono">
              {verified_users}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Campus email verified</p>
          </div>
        </Card>

        {/* Completed Profiles */}
        <Card className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-sky-600 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Profiles</span>
            <svg className="w-4 h-4 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
            </svg>
          </div>
          <div>
            <div data-testid="stat-completed-profiles" className="text-2xl font-bold text-slate-900 font-mono">
              {completed_profiles}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Onboarded students</p>
          </div>
        </Card>

        {/* Active Requirements */}
        <Card className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-indigo-600 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Requests</span>
            <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <div>
            <div data-testid="stat-active-requirements" className="text-2xl font-bold text-slate-900 font-mono">
              {active_requirements}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Active criteria listings</p>
          </div>
        </Card>

        {/* Conversations */}
        <Card className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-purple-600 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Chats</span>
            <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <div data-testid="stat-conversations" className="text-2xl font-bold text-slate-900 font-mono">
              {conversations}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Active conversations</p>
          </div>
        </Card>

        {/* Contact Agreements */}
        <Card className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Shared Info</span>
            <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <div data-testid="stat-contact-agreements" className="text-2xl font-bold text-slate-900 font-mono">
              {contact_share_agreements}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Mutual shares agreed</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

