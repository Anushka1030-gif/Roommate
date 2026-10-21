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
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Suggested Icebreakers
        </h4>
        <span className="text-[11px] text-slate-400">Click to copy prompt</span>
      </div>

      <div className="space-y-1.5">
        {icebreakers.map((prompt, idx) => {
          const isCopied = copiedIndex === idx;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleCopy(prompt, idx)}
              className="w-full text-left p-2.5 rounded-xl bg-teal-50/50 hover:bg-teal-50 border border-teal-100 hover:border-teal-200 text-xs text-slate-700 transition-all duration-150 flex items-center justify-between gap-3 group cursor-pointer"
            >
              <div className="flex items-start gap-2 min-w-0">
                <span className="text-teal-600 shrink-0 mt-0.5">💬</span>
                <span className="truncate italic">&ldquo;{prompt}&rdquo;</span>
              </div>
              <span
                className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors ${
                  isCopied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-teal-700 border border-teal-200 group-hover:bg-teal-600 group-hover:text-white group-hover:border-teal-600'
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
