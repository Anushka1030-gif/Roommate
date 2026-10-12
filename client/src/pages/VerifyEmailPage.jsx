import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { getErrorMessage } from '../utils/error.js';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Alert from '../components/ui/Alert.jsx';

export default function VerifyEmailPage() {
  const { user, verifyOtp, resendOtp, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Retrieve email from location state, query string, or current user
  const searchParams = new URLSearchParams(location.search);
  const initialEmail =
    location.state?.email || searchParams.get('email') || user?.email || '';

  const [email, setEmail] = useState(initialEmail);
  const [isEditingEmail, setIsEditingEmail] = useState(!initialEmail);

  // 6 digits array
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef([]);

  const [countdown, setCountdown] = useState(60);
  const canResend = countdown === 0;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(
    location.state?.fromRegister
      ? 'A 6-digit verification code has been sent to your email.'
      : null
  );

  // Resend countdown timer
  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  // Handle single digit input
  const handleDigitChange = (index, value) => {
    // Clean to numeric only
    const cleanValue = value.replace(/\D/g, '');

    // If pasted multiple digits
    if (cleanValue.length > 1) {
      handlePaste(cleanValue);
      return;
    }

    const newDigits = [...otpDigits];
    newDigits[index] = cleanValue;
    setOtpDigits(newDigits);
    setServerError(null);

    // Auto-advance to next input
    if (cleanValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (pastedText) => {
    const digits = pastedText.replace(/\D/g, '').slice(0, 6).split('');
    if (digits.length === 0) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = digits[i] || '';
    }
    setOtpDigits(newDigits);
    setServerError(null);

    // Focus last filled digit or next available
    const nextIndex = Math.min(digits.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setServerError(null);

    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      setServerError('Please enter the complete 6-digit verification code.');
      return;
    }

    if (!email) {
      setServerError('Please provide the email address to verify.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await verifyOtp({ email: email.trim().toLowerCase(), otp: fullOtp });
      setSuccessMessage(res.message || 'Email verified successfully!');

      setTimeout(() => {
        if (isAuthenticated) {
          navigate('/onboarding/profile', { replace: true });
        } else {
          navigate('/login', {
            state: { verifiedEmail: email, message: 'Email verified! Please log in to continue.' },
            replace: true,
          });
        }
      }, 1200);
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || isResending) return;
    if (!email) {
      setServerError('Please specify an email address to resend the code.');
      return;
    }

    try {
      setIsResending(true);
      setServerError(null);
      const res = await resendOtp({ email: email.trim().toLowerCase() });
      setSuccessMessage(res.message || 'A new verification code has been sent to your email.');
      setCountdown(60);
      setOtpDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setServerError(getErrorMessage(err));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-6">
      <Card className="shadow-lg border-slate-200">
        <Card.Header className="text-center pb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 mx-auto mb-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <Card.Title as="h1" className="text-2xl font-bold">
            Verify Your Email
          </Card.Title>
          <Card.Description>
            Enter the 6-digit confirmation code sent to your student email.
          </Card.Description>
        </Card.Header>

        <Card.Body className="space-y-5 pt-2">
          {/* Target Email display and change option */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-center justify-between text-sm">
            <div className="overflow-hidden mr-2">
              <p className="text-xs text-slate-500 font-medium">Verification Code Sent To</p>
              {isEditingEmail ? (
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@college.ac.in"
                  className="mt-1 px-2 py-1 text-sm bg-white border border-slate-300 rounded-lg w-full font-mono text-slate-900"
                />
              ) : (
                <p className="font-semibold text-slate-800 font-mono truncate">{email || 'Not specified'}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsEditingEmail(!isEditingEmail)}
              className="text-xs text-teal-700 hover:text-teal-900 font-medium whitespace-nowrap p-1"
            >
              {isEditingEmail ? 'Done' : 'Change'}
            </button>
          </div>

          {/* Messages */}
          {successMessage && (
            <Alert variant="success" title="Success" onClose={() => setSuccessMessage(null)}>
              {successMessage}
            </Alert>
          )}

          {serverError && (
            <Alert variant="error" title="Verification Error" onClose={() => setServerError(null)}>
              {serverError}
            </Alert>
          )}

          {/* OTP Digit inputs */}
          <form onSubmit={handleVerify} className="space-y-6">
            <div>
              <label
                htmlFor="otp-0"
                className="block text-sm font-medium text-slate-700 text-center mb-3"
              >
                6-Digit Verification Code
              </label>
              <div
                className="flex items-center justify-center gap-2 sm:gap-3"
                onPaste={(e) => {
                  e.preventDefault();
                  handlePaste(e.clipboardData.getData('text'));
                }}
              >
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-${idx}`}
                    ref={(el) => (inputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    aria-label={`Digit ${idx + 1}`}
                    className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold font-mono rounded-xl border border-slate-300 bg-white text-slate-900 shadow-xs focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none transition-all"
                  />
                ))}
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              isLoading={isSubmitting}
              disabled={otpDigits.join('').length !== 6}
            >
              Verify Email & Continue
            </Button>
          </form>

          {/* Resend OTP Section with 60-second countdown */}
          <div className="pt-2 border-t border-slate-100 flex flex-col items-center gap-2 text-center text-sm">
            <p className="text-slate-500 text-xs">Didn&apos;t receive the code or expired?</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResend}
              disabled={!canResend || isResending}
              isLoading={isResending}
              className="text-xs"
            >
              {canResend
                ? 'Resend Verification Code'
                : `Resend code in ${countdown}s`}
            </Button>
          </div>
        </Card.Body>

        <Card.Footer className="justify-center text-center text-xs text-slate-500">
          Return to{' '}
          <Link to="/login" className="text-teal-700 font-semibold underline ml-1">
            Log In
          </Link>
        </Card.Footer>
      </Card>
    </div>
  );
}
