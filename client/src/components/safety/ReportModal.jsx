import { useState } from 'react';
import Button from '../ui/Button.jsx';
import FormField from '../ui/FormField.jsx';
import Select from '../ui/Select.jsx';
import Textarea from '../ui/Textarea.jsx';

const REASON_OPTIONS = [
  { value: 'harassment', label: 'Harassment or abusive behavior' },
  { value: 'fake_profile', label: 'Fake profile or misleading identity' },
  { value: 'inappropriate_content', label: 'Inappropriate or offensive content' },
  { value: 'spam', label: 'Spam, advertising, or unsolicited promotion' },
  { value: 'other', label: 'Other concern' },
];

export default function ReportModal({
  isOpen,
  onClose,
  onSubmit,
  userName = 'this user',
  loading = false,
}) {
  const [reason, setReason] = useState('harassment');
  const [details, setDetails] = useState('');
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!reason) {
      setError('Please select a reason for your report.');
      return;
    }

    if (details.length > 500) {
      setError('Details cannot exceed 500 characters.');
      return;
    }

    try {
      await onSubmit({ reason, details: details.trim() || null });
      setDetails('');
      setReason('harassment');
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to submit report.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200/90 max-w-lg w-full p-6 space-y-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div>
              <h3 id="report-modal-title" className="text-lg font-bold text-slate-900">
                Report {userName}
              </h3>
              <p className="text-xs text-slate-500">
                Help keep the RoomieMatch student community safe and respectful.
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

        {/* Error notice */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            id="report-reason"
            label="Reason for reporting"
            required
          >
            <Select
              id="report-reason"
              name="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              options={REASON_OPTIONS}
              disabled={loading}
            />
          </FormField>

          <FormField
            id="report-details"
            label="Additional details (optional)"
            helperText={`${details.length}/500 characters`}
          >
            <Textarea
              id="report-details"
              name="details"
              rows={4}
              maxLength={500}
              placeholder="Describe the incident or reason for reporting (max 500 characters)..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              disabled={loading}
            />
          </FormField>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Your report is confidential and sent directly to our moderation administrators. The reported user will not be notified who submitted the report.
          </p>

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
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={loading}
            >
              Submit Report
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

