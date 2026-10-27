import { useState } from 'react';
import chatService from '../../services/chat.service.js';
import Button from '../ui/Button.jsx';
import Badge from '../ui/Badge.jsx';
import Spinner from '../ui/Spinner.jsx';

export default function ChatContactSharingBar({
  conversation,
  partner,
  contactDetails,
  loadingContact = false,
  togglingShare = false,
  confirmingRoommates = false,
  onToggleShare,
  onConfirmRoommates,
}) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneSuccess, setPhoneSuccess] = useState('');
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  if (!conversation) return null;

  const myShare = Boolean(conversation.my_share);
  const otherShared = Boolean(conversation.other_shared);
  const bothShared = Boolean(conversation.both_shared);

  const meConfirmed = Boolean(conversation.me_confirmed);
  const otherConfirmed = Boolean(conversation.other_confirmed);
  const bothConfirmed = Boolean(conversation.both_confirmed);

  const partnerName = partner?.full_name || 'your roommate';

  const handleToggle = () => {
    if (togglingShare || !onToggleShare) return;
    onToggleShare(!myShare);
  };

  const handleCopy = async (text, type) => {
    if (!text) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
      if (type === 'email') {
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2000);
      } else if (type === 'phone') {
        setCopiedPhone(true);
        setTimeout(() => setCopiedPhone(false), 2000);
      }
    } catch {
      // Fallback
    }
  };

  const handleConfirmRoommates = async () => {
    if (confirmingRoommates || !onConfirmRoommates) return;
    try {
      await onConfirmRoommates();
      setShowConfirmModal(false);
    } catch {
      // Handled by parent hook
    }
  };

  const handleSavePhone = async (e) => {
    e.preventDefault();
    setPhoneError('');
    setPhoneSuccess('');

    const trimmed = phoneInput.trim();
    if (trimmed) {
      const phoneRegex = /^(\+?[0-9]{1,4}[\s-]?)?([0-9]{10,14})$/;
      if (!phoneRegex.test(trimmed)) {
        setPhoneError('Please enter a valid 10 to 14 digit phone number.');
        return;
      }
    }

    try {
      setSavingPhone(true);
      await chatService.updatePhone(trimmed || null);
      setPhoneSuccess('Phone number saved successfully.');
      setTimeout(() => {
        setShowPhoneModal(false);
        setPhoneSuccess('');
        setPhoneInput('');
      }, 1200);
    } catch (err) {
      setPhoneError(err.response?.data?.error?.message || err.message || 'Failed to save phone number');
    } finally {
      setSavingPhone(false);
    }
  };

  return (
    <div className="border-b border-slate-200 bg-slate-50/70 text-slate-800 text-xs">
      {/* 1. Both Confirmed Roommates Congratulations Banner */}
      {bothConfirmed && (
        <div
          data-testid="congratulations-banner"
          className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white px-4 py-2.5 flex items-center justify-between shadow-xs animate-in fade-in duration-300"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-lg">🎉</span>
            <div className="min-w-0">
              <p className="font-bold text-xs sm:text-sm truncate">
                Congratulations! You and {partnerName} became roommates!
              </p>
              <p className="text-[11px] text-emerald-100 hidden sm:block">
                You are both confirmed roommates. We wish you an amazing co-living experience!
              </p>
            </div>
          </div>
          <span className="shrink-0 bg-white/20 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full border border-white/30">
            Confirmed Roommates
          </span>
        </div>
      )}

      {/* 2. Top Action Strip: Share Contact Toggle & Roommate Confirmation Status */}
      <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Contact Sharing Toggle & Status */}
        <div className="flex items-center gap-3 min-w-0">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              id="share-contact-toggle"
              aria-label="Share my contact"
              checked={myShare}
              onChange={handleToggle}
              disabled={togglingShare}
              className="w-4 h-4 text-teal-600 rounded-sm border-slate-300 focus:ring-teal-500 cursor-pointer disabled:opacity-50"
            />
            <span className="font-semibold text-slate-800 text-xs sm:text-sm">
              Share my contact
            </span>
          </label>

          {/* Partner agreement status pill */}
          {otherShared ? (
            <Badge variant="success" size="sm" className="flex items-center gap-1 font-medium">
              <svg className="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>They agreed</span>
            </Badge>
          ) : (
            <Badge variant="warning" size="sm" className="text-amber-800 bg-amber-50 border-amber-200">
              Waiting for them to agree
            </Badge>
          )}

          {togglingShare && <Spinner size="sm" className="text-teal-600" />}

          {/* Optional phone number button */}
          <button
            type="button"
            onClick={() => setShowPhoneModal(true)}
            aria-label="Manage Phone Number"
            className="text-[11px] text-teal-700 hover:text-teal-900 underline underline-offset-2 ml-1 cursor-pointer font-medium"
          >
            Add/edit phone
          </button>
        </div>

        {/* Right: Roommate Confirmation Button / Status */}
        <div className="flex items-center gap-2 shrink-0">
          {!bothConfirmed && (
            <>
              {meConfirmed ? (
                <div className="flex items-center gap-1.5 text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-[11px] font-medium">
                    Waiting for {partnerName} to confirm
                  </span>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowConfirmModal(true)}
                  disabled={confirmingRoommates}
                  className="text-xs border-teal-600 text-teal-700 hover:bg-teal-50"
                  aria-label="We became roommates"
                >
                  {otherConfirmed ? '🤝 Confirm Roommate (They Agreed!)' : '🤝 We became roommates'}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Explanatory text notice */}
      <div className="px-4 pb-2 text-[11px] text-slate-500 flex items-center justify-between">
        <span>
          Your contact is revealed only when both of you agree.
        </span>
      </div>

      {/* 3. Revealed Mutual Contact Card (Only shown when both agreed) */}
      {bothShared && (
        <div
          data-testid="contact-card"
          className="mx-4 mb-3 p-3.5 bg-white border border-teal-200 rounded-xl shadow-xs transition-all animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-teal-100 text-teal-700">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </span>
              <h3 className="font-bold text-slate-800 text-xs sm:text-sm">
                Mutual Contact Revealed
              </h3>
            </div>
            <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
              ✓ Both Agreed
            </span>
          </div>

          {loadingContact ? (
            <div className="flex items-center justify-center py-3 text-slate-400 gap-2">
              <Spinner size="sm" />
              <span>Fetching verified contact details...</span>
            </div>
          ) : contactDetails ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Email Card */}
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200/80">
                <div className="min-w-0 pr-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Email
                  </span>
                  <span className="font-medium text-slate-900 text-xs truncate block" title={contactDetails.email}>
                    {contactDetails.email}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(contactDetails.email, 'email')}
                  aria-label="Copy Email"
                  className="px-2 py-1 text-[11px] font-semibold text-teal-700 hover:text-teal-900 bg-white hover:bg-teal-50 border border-slate-200 rounded-md transition-colors cursor-pointer shrink-0"
                >
                  {copiedEmail ? 'Copied!' : 'Copy'}
                </button>
              </div>

              {/* Phone Card */}
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200/80">
                <div className="min-w-0 pr-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Phone
                  </span>
                  <span className="font-medium text-slate-900 text-xs truncate block">
                    {contactDetails.phone || (
                      <span className="text-slate-400 italic">Not provided</span>
                    )}
                  </span>
                </div>
                {contactDetails.phone && (
                  <button
                    type="button"
                    onClick={() => handleCopy(contactDetails.phone, 'phone')}
                    aria-label="Copy Phone"
                    className="px-2 py-1 text-[11px] font-semibold text-teal-700 hover:text-teal-900 bg-white hover:bg-teal-50 border border-slate-200 rounded-md transition-colors cursor-pointer shrink-0"
                  >
                    {copiedPhone ? 'Copied!' : 'Copy'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-slate-500 py-2">
              Contact details will be visible while both of you keep sharing enabled.
            </p>
          )}
        </div>
      )}

      {/* 4. "We Became Roommates" Confirmation Dialog Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-roommates-title"
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in zoom-in-95 duration-150"
          >
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mb-4 text-2xl mx-auto">
              🤝
            </div>
            <h3 id="confirm-roommates-title" className="text-base font-bold text-slate-900 text-center">
              Confirm Roommate Agreement
            </h3>
            <p className="text-xs text-slate-600 mt-2 text-center leading-relaxed">
              Did you and <span className="font-semibold text-slate-800">{partnerName}</span> agree to live together?
              When both of you confirm, you will be celebrated as confirmed roommates and excluded from each other&apos;s future roommate recommendations.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConfirmModal(false)}
                disabled={confirmingRoommates}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmRoommates}
                disabled={confirmingRoommates}
              >
                {confirmingRoommates ? (
                  <span className="flex items-center gap-1.5">
                    <Spinner size="sm" /> Confirming...
                  </span>
                ) : (
                  'Yes, We Became Roommates'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Add / Edit Optional Phone Modal */}
      {showPhoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="phone-modal-title"
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 animate-in zoom-in-95 duration-150"
          >
            <h3 id="phone-modal-title" className="text-sm font-bold text-slate-900 mb-1">
              Add Optional Phone Number
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Your phone is only revealed when you and your roommate match both toggle on contact sharing.
            </p>

            <form onSubmit={handleSavePhone} className="space-y-4">
              <div>
                <label htmlFor="contact-phone-input" className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  id="contact-phone-input"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-hidden"
                />
                {phoneError && <p className="text-rose-600 text-[11px] mt-1">{phoneError}</p>}
                {phoneSuccess && <p className="text-emerald-600 text-[11px] mt-1 font-semibold">{phoneSuccess}</p>}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPhoneModal(false)}
                  disabled={savingPhone}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={savingPhone}
                >
                  {savingPhone ? 'Saving...' : 'Save Phone'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
