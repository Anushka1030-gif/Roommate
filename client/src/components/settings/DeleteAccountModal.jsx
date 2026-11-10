import { useState } from 'react';
import Button from '../ui/Button.jsx';
import FormField from '../ui/FormField.jsx';
import Input from '../ui/Input.jsx';
import Alert from '../ui/Alert.jsx';

export default function DeleteAccountModal({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
}) {
  const [password, setPassword] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setPassword('');
    setConfirmed(false);
    setError(null);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!confirmed) {
      setError('Please check the confirmation box before proceeding.');
      return;
    }

    if (!password) {
      setError('Password is required to confirm account deletion.');
      return;
    }

    try {
      await onConfirm(password);
      setPassword('');
      setConfirmed(false);
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to delete account.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl shadow-xl border border-rose-200 max-w-md w-full p-6 space-y-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </div>
          <div>
            <h3 id="delete-account-modal-title" className="text-lg font-bold text-slate-900">
              Delete Your Account?
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Permanently remove your profile and deactivate your access.
            </p>
          </div>
        </div>

        {/* Warning Alert */}
        <Alert variant="danger" title="This action is permanent and irreversible">
          Your profile, housing criteria, and match results will be permanently removed. Your sent messages will be redacted to <code>[deleted]</code>. You will be logged out immediately.
        </Alert>

        {error && <Alert variant="danger">{error}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            label="Confirm Your Password"
            helperText="Enter your current account password to authorize deletion."
          >
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your account password"
              disabled={loading}
              autoComplete="current-password"
            />
          </FormField>

          <label className="flex items-start gap-3 p-3 bg-rose-50/70 border border-rose-200 rounded-xl cursor-pointer">
            <input
              type="checkbox"
              data-testid="delete-confirm-checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              disabled={loading}
              className="mt-0.5 h-4 w-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500"
            />
            <span className="text-xs font-medium text-rose-900 leading-snug">
              I understand that deleting my account is permanent and cannot be undone.
            </span>
          </label>

          {/* Action buttons */}
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
              variant="danger"
              size="md"
              isLoading={loading}
              disabled={!confirmed || !password}
            >
              Permanently Delete Account
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

