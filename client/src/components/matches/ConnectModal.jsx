import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button.jsx';

export default function ConnectModal({ match, isOpen, onClose }) {
  const navigate = useNavigate();
  const [copiedText, setCopiedText] = useState(null);

  if (!isOpen || !match) return null;

  const candidate = match.user || {};
  const icebreakers = match.icebreakers || [];

  const handleCopy = async (text) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 2000);
    } catch {
      // ignore
    }
  };

  const handleStartChat = () => {
    onClose();
    navigate(`/chats?candidateId=${match.candidate_id || candidate.id}&name=${encodeURIComponent(candidate.full_name || 'Roommate')}`);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="connect-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200/90 max-w-lg w-full p-6 space-y-5 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              {(candidate.full_name || 'R')[0]}
            </div>
            <div>
              <h3 id="connect-modal-title" className="text-lg font-bold text-slate-900">
                Start Chat with {candidate.full_name}
              </h3>
              <p className="text-xs text-slate-500">
                {candidate.college_name || 'Student'} • {candidate.city || 'Bhopal'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mutual Privacy Guard Reminder */}
        <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200/70 flex items-start gap-2.5 text-xs text-teal-900">
          <svg className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <div>
            <span className="font-semibold block">Consent-first Privacy</span>
            Your contact details remain completely private until both you and {candidate.full_name} agree to share contacts in chat.
          </div>
        </div>

        {/* Icebreakers suggestion */}
        {icebreakers.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 block">
              Suggested AI Conversation Starters
            </label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {icebreakers.map((prompt, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs flex items-center justify-between gap-3 text-slate-700"
                >
                  <span className="italic truncate">&ldquo;{prompt}&rdquo;</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(prompt)}
                    className="shrink-0 text-[11px] font-medium text-teal-700 hover:text-teal-900 px-2 py-0.5 rounded bg-white border border-teal-200 hover:bg-teal-50 transition-colors cursor-pointer"
                  >
                    {copiedText === prompt ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
          <Button variant="outline" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleStartChat}
            leftIcon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            }
          >
            Start Conversation
          </Button>
        </div>
      </div>
    </div>
  );
}
