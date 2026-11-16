import { useState } from 'react';

export default function IcebreakersList({ icebreakers = [], onSelect, className = '' }) {
  const [copiedIndex, setCopiedIndex] = useState(null);

  if (!icebreakers || icebreakers.length === 0) {
    return null;
  }

  const handleCopy = async (text, index) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      }
      setCopiedIndex(index);
      setTimeout(() => {
        setCopiedIndex(null);
      }, 2000);
      if (onSelect) {
        onSelect(text);
      }
    } catch {
      if (onSelect) {
        onSelect(text);
      }
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-peach-deep" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Suggested Icebreakers
        </h4>
        <span className="text-[11px] text-text-secondary/70">Click to copy prompt</span>
      </div>

      <div className="space-y-1.5">
        {icebreakers.map((prompt, idx) => {
          const isCopied = copiedIndex === idx;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleCopy(prompt, idx)}
              className="w-full text-left p-2.5 rounded-xl bg-peach-soft/30 hover:bg-peach-soft/60 border border-peach/30 hover:border-peach/60 text-xs text-text-primary transition-all duration-150 flex items-center justify-between gap-3 group cursor-pointer"
            >
              <div className="flex items-start gap-2 min-w-0">
                <span className="text-peach-deep shrink-0 mt-0.5">💬</span>
                <span className="truncate italic">&ldquo;{prompt}&rdquo;</span>
              </div>
              <span
                className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors ${
                  isCopied
                    ? 'bg-[#5E9C76] text-white'
                    : 'bg-surface text-text-primary border border-surface-border group-hover:bg-peach-deep group-hover:text-white group-hover:border-peach-deep'
                }`}
              >
                {isCopied ? 'Copied!' : 'Copy'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
