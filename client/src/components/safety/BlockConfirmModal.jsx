import Button from '../ui/Button.jsx';

export default function BlockConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  userName = 'this user',
  loading = false,
}) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="block-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200/90 max-w-md w-full p-6 space-y-4 overflow-hidden">
        {/* Warning Icon & Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          </div>
          <div>
            <h3 id="block-modal-title" className="text-lg font-bold text-slate-900">
              Block {userName}?
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Are you sure you want to block {userName}?
            </p>
          </div>
        </div>

        {/* Informative Explanatory Body */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-600 space-y-2">
          <p>
            • <strong>Matches:</strong> Both of you will disappear from each other&apos;s roommate matches immediately.
          </p>
          <p>
            • <strong>Messaging:</strong> Your conversation will become read-only and no new messages can be sent.
          </p>
          <p>
            • <strong>Privacy:</strong> Contact details cannot be viewed or shared.
          </p>
          <p className="text-slate-400 text-[11px] pt-1">
            You can unblock {userName} at any time from your Account Settings.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer px-4 py-2 text-sm rounded-lg bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500 shadow-xs"
          >
            {loading ? 'Blocking...' : 'Block User'}
          </button>
        </div>
      </div>
    </div>
  );
}

