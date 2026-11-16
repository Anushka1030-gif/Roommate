import { useState } from 'react';

const DEFAULT_ICEBREAKERS = [
  'Hey! Have you started looking at flats or PGs around college yet?',
  'Hi! What semester or year are you in?',
  'Hello! What does your typical daily study & sleep routine look like?',
  'Hey! What is your preferred move-in timeline?',
];

export default function ChatIcebreakers({
  icebreakers = [],
  onSelectPrompt,
  onSendPrompt,
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const promptList = icebreakers && icebreakers.length > 0 ? icebreakers : DEFAULT_ICEBREAKERS;

  return (
    <div className="border-t border-surface-border bg-beige-50/70 px-4 py-2 text-xs transition-all">
      <div className="flex items-center justify-between mb-1.5">
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex items-center gap-1.5 text-text-primary hover:text-peach-deep font-semibold cursor-pointer group focus:outline-none"
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-peach-soft text-text-primary group-hover:bg-peach">
            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
            </svg>
          </span>
          <span>Suggested Icebreakers</span>
          <svg
            className={`w-3.5 h-3.5 text-text-secondary/60 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <span className="text-[11px] text-text-secondary/70 hidden sm:inline">Tap to use or send directly</span>
      </div>

      {isExpanded && (
        <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin no-scrollbar">
          {promptList.map((prompt, idx) => (
            <div
              key={idx}
              className="inline-flex items-center shrink-0 bg-surface border border-peach/40 hover:border-peach rounded-full pl-3 pr-1 py-1 shadow-2xs text-text-primary hover:text-peach-deep transition-colors gap-1.5 group"
            >
              <button
                type="button"
                onClick={() => onSelectPrompt(prompt)}
                className="text-left text-xs truncate max-w-[240px] sm:max-w-[320px] cursor-pointer hover:underline focus:outline-none"
                title={`Insert: "${prompt}"`}
              >
                &ldquo;{prompt}&rdquo;
              </button>
              {onSendPrompt && (
                <button
                  type="button"
                  onClick={() => onSendPrompt(prompt)}
                  title="Send immediately"
                  className="w-5 h-5 rounded-full bg-peach-soft hover:bg-peach-deep hover:text-white text-text-primary flex items-center justify-center transition-colors cursor-pointer shrink-0"
                >
                  <svg className="w-2.5 h-2.5 rotate-45 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
