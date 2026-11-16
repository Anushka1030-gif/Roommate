import { useState } from 'react';
import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import Badge from '../ui/Badge.jsx';
import MatchScoreBadge from './MatchScoreBadge.jsx';
import MatchLifestyleSummary from './MatchLifestyleSummary.jsx';
import ScoreBreakdownBars from './ScoreBreakdownBars.jsx';
import IcebreakersList from './IcebreakersList.jsx';
import SafetyActionMenu from '../safety/SafetyActionMenu.jsx';

export default function MatchCard({
  match,
  rank,
  onLike,
  onSkip,
  onConnect,
  onBlock,
  onReport,
  isLiked = false,
  isSkipped = false,
  isConnected = false,
  onSelectIcebreaker,
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [showIcebreakers, setShowIcebreakers] = useState(false);

  const candidate = match.user || {};
  const score = match.score ?? match.compatibility_score ?? 85;
  const isTopRanked = rank === 1;

  const candidateName = candidate.full_name || 'Roommate Candidate';
  const candidateInitial = candidateName.charAt(0).toUpperCase();

  // Highlight chips (ensure at least 2)
  const highlights = Array.isArray(match.highlights) && match.highlights.length > 0
    ? match.highlights
    : ['Compatible daily habits', 'Aligned housing budget'];

  const watchOut = match.watch_out || null;
  const explanation = match.explanation || 'Strong compatibility across lifestyle and housing dimensions.';

  return (
    <Card
      hover
      className={`relative transition-all duration-200 ${
        isTopRanked
          ? 'ring-2 ring-peach/50 border-peach-deep/40 shadow-sm'
          : 'border-surface-border shadow-xs'
      } ${isSkipped ? 'opacity-60 bg-beige-50/50' : 'bg-surface'}`}
    >
      {/* Top match accent ribbon */}
      {isTopRanked && (
        <div className="bg-gradient-to-r from-peach-deep to-peach text-white text-[11px] font-bold px-4 py-1 flex items-center justify-between tracking-wide">
          <span className="flex items-center gap-1.5">
            <span>⭐</span>
            <span>TOP COMPATIBILITY MATCH</span>
          </span>
          <span className="text-peach-soft font-medium text-[10px]">Ranked #1</span>
        </div>
      )}

      <div className="p-6 sm:p-7 space-y-6">
        {/* Candidate Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Avatar with initials (Strict Privacy: no real photo or PII needed) */}
            <div className="relative shrink-0">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl shadow-xs ${
                  isTopRanked
                    ? 'bg-gradient-to-br from-peach-deep to-peach text-white ring-2 ring-peach/30'
                    : 'bg-beige-300 text-text-primary'
                }`}
              >
                {candidateInitial}
              </div>
              {/* Status Indicator */}
              <div
                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#5E9C76] border-2 border-white ring-1 ring-[#5E9C76]/30"
                title="Verified Student Account"
              />
            </div>

            {/* Candidate details */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-bold text-text-primary tracking-tight">
                  {candidateName}
                </h3>
                {candidate.age && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-beige text-text-primary border border-surface-border">
                    {candidate.age} yrs
                  </span>
                )}
                {candidate.gender && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-beige text-text-secondary capitalize">
                    {candidate.gender.replace(/_/g, ' ')}
                  </span>
                )}
                {match.source === 'llm' && (
                  <Badge variant="primary" size="sm" dot>
                    AI Verified
                  </Badge>
                )}
              </div>

              {/* Academic & Location details */}
              <p className="text-xs text-text-secondary flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-semibold text-text-primary">
                  {candidate.college_name || 'College Student'}
                </span>
                {candidate.major && (
                  <>
                    <span className="text-surface-border">•</span>
                    <span>{candidate.major}</span>
                  </>
                )}
                {candidate.graduation_year && (
                  <span className="text-text-secondary/70">(&apos;{String(candidate.graduation_year).slice(-2)})</span>
                )}
                {candidate.city && (
                  <>
                    <span className="text-surface-border">•</span>
                    <span className="inline-flex items-center gap-1 text-text-secondary">
                      <svg className="w-3 h-3 text-peach-deep" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {candidate.city}
                    </span>
                  </>
                )}
              </p>

              {/* Bio snippet if available */}
              {candidate.bio && (
                <p className="text-xs text-text-secondary italic mt-1 line-clamp-2">
                  &ldquo;{candidate.bio}&rdquo;
                </p>
              )}
            </div>
          </div>

          {/* Compatibility Score Badge & Safety Action Menu */}
          <div className="shrink-0 sm:self-start flex items-center gap-2">
            <MatchScoreBadge score={score} rank={rank} />
            {(onBlock || onReport) && (
              <SafetyActionMenu
                userName={candidateName}
                onBlock={() => onBlock && onBlock(match)}
                onReport={() => onReport && onReport(match)}
              />
            )}
          </div>
        </div>

        {/* AI "Why You Match" Explanation Callout */}
        <div className="p-4 rounded-2xl bg-peach-soft/40 border border-peach/50 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-primary flex items-center gap-1.5 uppercase tracking-wider">
              <span className="text-sm">✨</span>
              Why you match
            </span>
            <span className="text-[10px] font-medium text-text-primary bg-surface px-2 py-0.5 rounded-full border border-peach/40 shadow-2xs">
              {match.source === 'llm' ? 'AI Synthesized' : 'Algorithm Matched'}
            </span>
          </div>
          <p className="text-xs text-text-primary leading-relaxed font-normal">
            {explanation}
          </p>
        </div>

        {/* Highlights & Strengths Chips */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-text-secondary mr-1">Top Matches:</span>
            {highlights.map((strength, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-beige text-text-primary border border-peach/40 shadow-2xs"
              >
                <svg className="w-3.5 h-3.5 text-peach-deep shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                {strength}
              </span>
            ))}
          </div>

          {/* Potential Friction / Watch-out Note if Present (Rule 4: Soft warm amber, not red) */}
          {watchOut && (
            <div className="mt-2 p-3 rounded-xl bg-[#D9A441]/15 border border-[#D9A441]/40 text-xs text-[#6B4B10] flex items-start gap-2.5">
              <svg className="w-4 h-4 text-[#D9A441] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <span className="font-semibold mr-1">Keep in mind:</span>
                <span className="text-[#6B4B10]">{watchOut}</span>
              </div>
            </div>
          )}
        </div>

        {/* Compact Lifestyle Summary */}
        <MatchLifestyleSummary user={candidate} />

        {/* Collapsible Dimension Score Breakdown */}
        {match.score_breakdown && Object.keys(match.score_breakdown).length > 0 && (
          <div className="border-t border-surface-border/60 pt-3">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs font-semibold text-text-secondary hover:text-text-primary flex items-center justify-between w-full py-1 cursor-pointer transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <svg
                  className={`w-4 h-4 text-peach-deep transition-transform ${showDetails ? 'rotate-90' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Detailed Compatibility Breakdown
              </span>
              <span className="text-[11px] text-peach-deep font-medium">
                {showDetails ? 'Hide breakdown' : 'View all 8 dimensions'}
              </span>
            </button>
            {showDetails && (
              <div className="mt-3 pt-3 border-t border-surface-border/60 animate-in fade-in duration-150">
                <ScoreBreakdownBars breakdown={match.score_breakdown} />
              </div>
            )}
          </div>
        )}

        {/* Collapsible AI Icebreakers */}
        {match.icebreakers && match.icebreakers.length > 0 && (
          <div className="border-t border-surface-border/60 pt-3">
            <button
              type="button"
              onClick={() => setShowIcebreakers(!showIcebreakers)}
              className="text-xs font-semibold text-text-secondary hover:text-text-primary flex items-center justify-between w-full py-1 cursor-pointer transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <svg
                  className={`w-4 h-4 text-peach-deep transition-transform ${showIcebreakers ? 'rotate-90' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Suggested Conversation Starters ({match.icebreakers.length})
              </span>
              <span className="text-[11px] text-peach-deep font-medium">
                {showIcebreakers ? 'Hide icebreakers' : 'Show prompts'}
              </span>
            </button>
            {showIcebreakers && (
              <div className="mt-3 pt-3 border-t border-surface-border/60 animate-in fade-in duration-150">
                <IcebreakersList
                  icebreakers={match.icebreakers}
                  onSelect={onSelectIcebreaker}
                />
              </div>
            )}
          </div>
        )}

        {/* Action Bar (Like, Skip, Start Chat) */}
        <div className="pt-5 border-t border-surface-border/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Like & Skip secondary action buttons */}
          <div className="flex items-center gap-2">
            {/* Like Button */}
            <button
              type="button"
              onClick={() => onLike(match)}
              aria-label={isLiked ? 'Unlike candidate' : 'Like candidate'}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 border cursor-pointer ${
                isLiked
                  ? 'bg-peach-soft text-peach-deep border-peach shadow-2xs'
                  : 'bg-surface hover:bg-beige-50 text-text-secondary border-surface-border'
              }`}
            >
              <span className={isLiked ? 'text-peach-deep' : 'text-text-secondary/60'}>
                {isLiked ? '❤️' : '🤍'}
              </span>
              <span>{isLiked ? 'Liked' : 'Like'}</span>
            </button>

            {/* Skip / Dismiss Button */}
            <button
              type="button"
              onClick={() => onSkip(match)}
              aria-label={isSkipped ? 'Unskip candidate' : 'Skip candidate'}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 border cursor-pointer ${
                isSkipped
                  ? 'bg-beige-300 text-text-primary border-surface-border'
                  : 'bg-surface hover:bg-beige-50 text-text-secondary border-surface-border'
              }`}
            >
              <span>{isSkipped ? '↩️' : '👁️‍🗨️'}</span>
              <span>{isSkipped ? 'Restore' : 'Skip'}</span>
            </button>
          </div>

          {/* Primary "Start Chat" CTA button */}
          <Button
            variant="primary"
            size="md"
            onClick={() => onConnect(match)}
            leftIcon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            }
          >
            {isConnected ? 'Continue Chat' : 'Start Chat'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
