import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import matchesService from '../services/matches.service.js';
import requirementService from '../services/requirement.service.js';
import { useToast } from '../hooks/useToast.js';
import { getErrorMessage } from '../utils/error.js';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Alert from '../components/ui/Alert.jsx';
import MatchCard from '../components/matches/MatchCard.jsx';
import MatchFilters from '../components/matches/MatchFilters.jsx';
import MatchSkeleton from '../components/matches/MatchSkeleton.jsx';
import ConnectModal from '../components/matches/ConnectModal.jsx';

export default function MatchesPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [matches, setMatches] = useState([]);
  const [hasEnoughMatches, setHasEnoughMatches] = useState(true);
  const [infoMessage, setInfoMessage] = useState(null);
  const [activeRequirement, setActiveRequirement] = useState(null);

  // Filter & Search states
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [lifestyleFilter, setLifestyleFilter] = useState('all');
  const [sortBy, setSortBy] = useState('score');

  // Modal state
  const [selectedMatchForChat, setSelectedMatchForChat] = useState(null);

  // Load matches and active requirement
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [matchesRes, reqRes] = await Promise.all([
        matchesService.getMatches(),
        requirementService.getActiveRequirement().catch(() => null),
      ]);

      setMatches(matchesRes.matches || []);
      setHasEnoughMatches(matchesRes.has_enough_matches !== false);
      setInfoMessage(matchesRes.message || null);
      setActiveRequirement(reqRes);
      setError(null);
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to load your matches. Please try again.');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    let isMounted = true;

    async function initialFetch() {
      try {
        const [matchesRes, reqRes] = await Promise.all([
          matchesService.getMatches(),
          requirementService.getActiveRequirement().catch(() => null),
        ]);

        if (isMounted) {
          setMatches(matchesRes.matches || []);
          setHasEnoughMatches(matchesRes.has_enough_matches !== false);
          setInfoMessage(matchesRes.message || null);
          setActiveRequirement(reqRes);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          const msg = getErrorMessage(err, 'Failed to load your matches. Please try again.');
          setError(msg);
          toast.error(msg);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initialFetch();

    return () => {
      isMounted = false;
    };
  }, [toast]);

  // Handle Refresh matches (rate limited to 5/day)
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const result = await matchesService.refreshMatches();
      setMatches(result.matches || []);
      setHasEnoughMatches(result.has_enough_matches !== false);
      setInfoMessage(result.message || null);
      toast.success('Matches refreshed successfully!');
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not refresh matches at this time.');
      toast.error(msg);
    } finally {
      setRefreshing(false);
    }
  };

  // Handle Like Action
  const handleLike = async (match) => {
    const isCurrentlyLiked = match.status === 'liked';
    const nextStatus = isCurrentlyLiked ? 'suggested' : 'liked';

    // Optimistic update
    setMatches((prev) =>
      prev.map((m) =>
        m.id === match.id || m.candidate_id === match.candidate_id
          ? { ...m, status: nextStatus }
          : m
      )
    );

    try {
      await matchesService.updateMatchStatus(match.id || match.candidate_id, nextStatus);
      toast.success(
        nextStatus === 'liked'
          ? `Added ${match.user?.full_name || 'candidate'} to your liked matches!`
          : `Removed ${match.user?.full_name || 'candidate'} from liked matches.`
      );
    } catch {
      // Revert optimistic update
      setMatches((prev) =>
        prev.map((m) =>
          m.id === match.id || m.candidate_id === match.candidate_id
            ? { ...m, status: match.status }
            : m
        )
      );
      toast.error('Failed to update match status.');
    }
  };

  // Handle Skip Action
  const handleSkip = async (match) => {
    const isCurrentlySkipped = match.status === 'skipped';
    const nextStatus = isCurrentlySkipped ? 'suggested' : 'skipped';

    // Optimistic update
    setMatches((prev) =>
      prev.map((m) =>
        m.id === match.id || m.candidate_id === match.candidate_id
          ? { ...m, status: nextStatus }
          : m
      )
    );

    try {
      await matchesService.updateMatchStatus(match.id || match.candidate_id, nextStatus);
      toast.info(
        nextStatus === 'skipped'
          ? `Skipped ${match.user?.full_name || 'candidate'}. You can restore them anytime from the Skipped tab.`
          : `Restored ${match.user?.full_name || 'candidate'} to your matches.`
      );
    } catch {
      // Revert optimistic update
      setMatches((prev) =>
        prev.map((m) =>
          m.id === match.id || m.candidate_id === match.candidate_id
            ? { ...m, status: match.status }
            : m
        )
      );
      toast.error('Failed to update match status.');
    }
  };

  // Handle Connect / Start Chat
  const handleConnect = async (match) => {
    // If not connected yet, mark status as connected
    if (match.status !== 'connected') {
      try {
        await matchesService.updateMatchStatus(match.id || match.candidate_id, 'connected');
        setMatches((prev) =>
          prev.map((m) =>
            m.id === match.id || m.candidate_id === match.candidate_id
              ? { ...m, status: 'connected' }
              : m
          )
        );
      } catch {
        // Continue opening modal even if status update fails
      }
    }
    setSelectedMatchForChat(match);
  };

  // Counts for tabs
  const tabCounts = useMemo(() => {
    const counts = {
      all: matches.length,
      suggested: 0,
      liked: 0,
      connected: 0,
      skipped: 0,
    };
    matches.forEach((m) => {
      const st = m.status || 'suggested';
      if (counts[st] !== undefined) {
        counts[st] += 1;
      } else {
        counts.suggested += 1;
      }
    });
    return counts;
  }, [matches]);

  // Filtered and sorted matches
  const filteredMatches = useMemo(() => {
    return matches
      .filter((m) => {
        const user = m.user || {};
        const st = m.status || 'suggested';

        // Tab status filter
        if (activeTab !== 'all' && st !== activeTab) {
          return false;
        }

        // Search query filter (name or college)
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          const name = (user.full_name || '').toLowerCase();
          const college = (user.college_name || '').toLowerCase();
          const major = (user.major || '').toLowerCase();
          if (!name.includes(query) && !college.includes(query) && !major.includes(query)) {
            return false;
          }
        }

        // Lifestyle filter
        if (lifestyleFilter !== 'all') {
          if (lifestyleFilter === 'early_bird' && user.sleep_schedule !== 'early_bird') return false;
          if (lifestyleFilter === 'night_owl' && user.sleep_schedule !== 'night_owl') return false;
          if (lifestyleFilter === 'clean_high' && Number(user.cleanliness_level || 0) < 4) return false;
          if (lifestyleFilter === 'veg' && user.food_preference !== 'vegetarian') return false;
          if (lifestyleFilter === 'non_smoker' && !['no', 'never'].includes(user.smoking_preference)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'score') {
          return (b.score ?? b.compatibility_score ?? 0) - (a.score ?? a.compatibility_score ?? 0);
        }
        if (sortBy === 'cleanliness') {
          return (Number(b.user?.cleanliness_level) || 0) - (Number(a.user?.cleanliness_level) || 0);
        }
        if (sortBy === 'age') {
          return (Number(a.user?.age) || 0) - (Number(b.user?.age) || 0);
        }
        return 0;
      });
  }, [matches, activeTab, searchQuery, lifestyleFilter, sortBy]);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Compatible Roommates
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
              Top 3 AI Ranked
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Ranked based on your lifestyle profile, habits, deal-breakers, and importance weights.
          </p>
        </div>

        {/* Refresh matches button */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="md"
            onClick={handleRefresh}
            isLoading={refreshing}
            disabled={loading}
            aria-label="Refresh matches"
            leftIcon={
              <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            }
          >
            Refresh Matches
          </Button>
        </div>
      </div>

      {/* Active Requirement Summary Pill / Bar */}
      {activeRequirement ? (
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-700">
            <span className="font-semibold text-slate-900 flex items-center gap-1.5">
              <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              {activeRequirement.city || 'Bhopal'}
            </span>
            <span className="text-slate-300">•</span>
            <span>
              Budget: ₹{activeRequirement.budget_min?.toLocaleString()} – ₹{activeRequirement.budget_max?.toLocaleString()}/mo
            </span>
            <span className="text-slate-300">•</span>
            <span className="capitalize">
              {activeRequirement.preferred_sleep_schedule?.replace(/_/g, ' ') || 'Any sleep routine'}
            </span>
            <span className="text-slate-300">•</span>
            <span>Cleanliness ≥ {activeRequirement.preferred_cleanliness_min || 1}/5</span>
          </div>

          <Link
            to="/requirement"
            className="text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-1 hover:underline"
          >
            <span>Edit Criteria</span>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      ) : !loading && (
        <Alert variant="warning" title="No Active Housing Requirement">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-1">
            <span>
              You haven&apos;t set your housing preferences and budget yet. Setting requirements allows our matching engine to calculate real compatibility.
            </span>
            <Button
              size="sm"
              variant="primary"
              onClick={() => navigate('/requirement')}
            >
              Set Requirements
            </Button>
          </div>
        </Alert>
      )}

      {/* Candidate Pool Warning (< 3 candidates) */}
      {!hasEnoughMatches && infoMessage && (
        <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200/90 text-amber-900 text-xs flex items-start gap-3 shadow-2xs">
          <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="space-y-1">
            <span className="font-bold text-sm block">Growing Community in Your City</span>
            <p className="text-amber-800 leading-relaxed">
              {infoMessage} You can also consider widening your budget range in{' '}
              <Link to="/requirement" className="underline font-semibold hover:text-amber-950">
                Housing Requirements
              </Link>{' '}
              to discover more potential candidates.
            </p>
          </div>
        </div>
      )}

      {/* Privacy Notice Banner */}
      <div className="p-3.5 rounded-2xl bg-slate-100/70 border border-slate-200/70 flex items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-teal-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span>
            <strong>Verified Student Matching:</strong> Personal contact details remain strictly private until mutual consent in chat.
          </span>
        </div>
      </div>

      {/* Filters and Controls */}
      {!loading && matches.length > 0 && (
        <MatchFilters
          activeTab={activeTab}
          onTabChange={setActiveTab}
          counts={tabCounts}
          sortBy={sortBy}
          onSortChange={setSortBy}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          lifestyleFilter={lifestyleFilter}
          onLifestyleFilterChange={setLifestyleFilter}
        />
      )}

      {/* Main Content Area */}
      {loading ? (
        <MatchSkeleton count={3} />
      ) : error ? (
        <Card className="p-10 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-xl">
            ⚠️
          </div>
          <Card.Title>Unable to Load Matches</Card.Title>
          <p className="text-sm text-slate-600 max-w-md mx-auto">{error}</p>
          <Button variant="primary" size="md" onClick={loadData}>
            Retry
          </Button>
        </Card>
      ) : filteredMatches.length === 0 ? (
        <Card className="p-10 text-center space-y-4 bg-white border border-slate-200">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center text-2xl shadow-2xs">
            {activeTab === 'liked' ? '❤️' : activeTab === 'skipped' ? '👁️‍🗨️' : '🔍'}
          </div>
          <Card.Title>
            {activeTab === 'liked'
              ? 'No Liked Matches Yet'
              : activeTab === 'skipped'
              ? 'No Skipped Matches'
              : activeTab === 'connected'
              ? 'No Connected Matches Yet'
              : 'No Matches Found with Current Filters'}
          </Card.Title>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            {activeTab === 'liked'
              ? 'When you like a candidate by tapping the heart icon, they will be organized right here for easy reference.'
              : activeTab === 'skipped'
              ? 'Candidates you dismiss with the skip button appear here in case you want to restore them later.'
              : activeTab === 'connected'
              ? 'Start a chat with a match to see them here!'
              : 'Try clearing your search query or switching back to "All Matches".'}
          </p>
          <div className="pt-2 flex justify-center gap-3">
            {activeTab !== 'all' && (
              <Button variant="outline" size="sm" onClick={() => setActiveTab('all')}>
                View All Matches
              </Button>
            )}
            {searchQuery && (
              <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')}>
                Clear Search
              </Button>
            )}
          </div>
        </Card>
      ) : (
        /* Match Cards Feed */
        <div className="space-y-6">
          {filteredMatches.map((match, index) => (
            <MatchCard
              key={match.id || match.candidate_id || index}
              match={match}
              rank={index + 1}
              isLiked={match.status === 'liked'}
              isSkipped={match.status === 'skipped'}
              isConnected={match.status === 'connected'}
              onLike={handleLike}
              onSkip={handleSkip}
              onConnect={handleConnect}
              onSelectIcebreaker={() => {
                toast.success('Icebreaker prompt copied! Opening chat...');
                handleConnect(match);
              }}
            />
          ))}
        </div>
      )}

      {/* Connect Modal for Starting Chat */}
      <ConnectModal
        match={selectedMatchForChat}
        isOpen={Boolean(selectedMatchForChat)}
        onClose={() => setSelectedMatchForChat(null)}
      />
    </div>
  );
}
