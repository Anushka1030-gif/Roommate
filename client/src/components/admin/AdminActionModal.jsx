import { useState } from 'react';
import Button from '../ui/Button.jsx';
import FormField from '../ui/FormField.jsx';
import Textarea from '../ui/Textarea.jsx';
import Alert from '../ui/Alert.jsx';
import Badge from '../ui/Badge.jsx';

export default function AdminActionModal({
  isOpen,
  onClose,
  report,
  action,
  onSubmit,
  loading = false,
}) {
  const [note, setNote] = useState('');
  const [confirmedSuspend, setConfirmedSuspend] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !report) return null;

  const isSuspend = action === 'suspend';
  const isWarn = action === 'warn';

  const actionTitle = isSuspend
    ? 'Suspend User Account'
    : isWarn
    ? 'Issue Community Warning'
    : 'Dismiss Report';

  const handleClose = () => {
    setNote('');
    setConfirmedSuspend(false);
    setError(null);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (isSuspend && !confirmedSuspend) {
      setError('You must check the confirmation box before suspending the account.');
      return;
    }

    if (note.length > 500) {
      setError('Note cannot exceed 500 characters.');
      return;
    }

    try {
      await onSubmit({
        action,
        note: note.trim() || undefined,
      });
      setNote('');
      setConfirmedSuspend(false);
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to perform moderation action.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-action-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isSuspend
                  ? 'bg-rose-100 text-rose-700'
                  : isWarn
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {isSuspend ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              ) : isWarn ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <div>
              <h3 id="admin-action-modal-title" className="text-lg font-bold text-slate-900">
                {actionTitle}
              </h3>
              <p className="text-xs text-slate-500">
                Report #{report.id} • Reason: <span className="font-semibold">{report.reason}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Reported User Details Summary */}
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Reported Student:</span>
            <span className="font-semibold text-slate-900">{report.reported_user?.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Student Email:</span>
            <span className="font-mono text-slate-700">{report.reported_user?.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Total Incident Reports:</span>
            <Badge
              variant={report.reported_user?.total_reports_count > 1 ? 'danger' : 'neutral'}
              size="sm"
            >
              {report.reported_user?.total_reports_count || 1} report(s)
            </Badge>
          </div>
        </div>

        {/* Action Specific Alerts */}
        {isSuspend && (
          <Alert variant="danger" title="Immediate Account Suspension">
            This action will set the student&apos;s account status to <strong>suspended</strong>, immediately terminate all active sessions and disconnect their chat connection, and block future logins.
          </Alert>
        )}

        {isWarn && (
          <Alert variant="warning" title="Official Community Warning">
            This will mark the report as reviewed and send an official warning email to{' '}
            <strong className="font-mono">{report.reported_user?.email}</strong> with your note.
          </Alert>
        )}

        {error && (
          <Alert variant="danger">
            {error}
          </Alert>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            label={isSuspend ? 'Suspension Reason / Internal Note' : isWarn ? 'Warning Message to Student' : 'Admin Note (Optional)'}
            helperText="Maximum 500 characters. Saved to audit history."
          >
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                isSuspend
                  ? 'Explain the severe violation leading to account suspension...'
                  : isWarn
                  ? 'Specify what community guideline was violated and expectations...'
                  : 'Add any notes on why this report was dismissed...'
              }
              rows={3}
              maxLength={500}
              disabled={loading}
              className="resize-none"
            />
          </FormField>

          {/* Suspend Confirmation Checkbox */}
          {isSuspend && (
            <label className="flex items-start gap-3 p-3 bg-rose-50/70 border border-rose-200 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                data-testid="suspend-confirm-checkbox"
                checked={confirmedSuspend}
                onChange={(e) => setConfirmedSuspend(e.target.checked)}
                disabled={loading}
                className="mt-0.5 h-4 w-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500"
              />
              <span className="text-xs font-medium text-rose-900 leading-snug">
                I confirm that I want to suspend <strong>{report.reported_user?.name}</strong> immediately.
              </span>
            </label>
          )}

          {/* Modal Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={isSuspend ? 'danger' : isWarn ? 'primary' : 'outline'}
              size="md"
              isLoading={loading}
              disabled={isSuspend && !confirmedSuspend}
            >
              {isSuspend
                ? 'Confirm & Suspend User'
                : isWarn
                ? 'Send Warning'
                : 'Dismiss Report'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
