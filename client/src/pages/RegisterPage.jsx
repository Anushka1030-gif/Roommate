import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { getErrorMessage, getErrorCode } from '../utils/error.js';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import FormField from '../components/ui/FormField.jsx';
import Card from '../components/ui/Card.jsx';
import Alert from '../components/ui/Alert.jsx';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    consent: false,
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isBlockedDomain, setIsBlockedDomain] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
    if (serverError) {
      setServerError(null);
      setIsBlockedDomain(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim() || formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name is required (minimum 2 characters)';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'College email address is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    if (!formData.consent) {
      newErrors.consent = 'You must agree to the Terms of Service and Privacy Policy to register';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);
    setIsBlockedDomain(false);

    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      const email = formData.email.trim().toLowerCase();
      await register({
        full_name: formData.fullName.trim(),
        email,
        password: formData.password,
      });

      // Redirect to verification screen with the entered email
      navigate('/verify-email', {
        state: { email, fromRegister: true },
        replace: true,
      });
    } catch (err) {
      const code = getErrorCode(err);
      const message = getErrorMessage(err);

      if (code === 'EMAIL_DOMAIN_NOT_ALLOWED' || /public email provider/i.test(message)) {
        setIsBlockedDomain(true);
        setServerError(message);
      } else {
        setServerError(message);
      }
    } finally {
      setIsSubmitting(false);
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
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
          </div>
          <Card.Title as="h1" className="text-2xl font-bold">
            Create Student Account
          </Card.Title>
          <Card.Description>
            Join RoomieMatch to connect with verified college roommates.
          </Card.Description>
        </Card.Header>

        <Card.Body className="pt-2">
          {/* Blocked Domain Warning Alert */}
          {isBlockedDomain && (
            <Alert
              variant="warning"
              title="Official College Email Required"
              className="mb-6"
            >
              <p className="mt-1">
                RoomieMatch is strictly restricted to enrolled students. Public email providers
                like Gmail, Yahoo, or Outlook are not permitted.
              </p>
              <p className="mt-2 text-xs font-semibold text-amber-950">
                Please register using your official campus domain (e.g.,{' '}
                <span className="font-mono">name@manit.ac.in</span> or{' '}
                <span className="font-mono">student@university.edu</span>).
              </p>
            </Alert>
          )}

          {/* General Server Error Alert */}
          {serverError && !isBlockedDomain && (
            <Alert variant="error" title="Registration Failed" className="mb-6">
              {serverError}
            </Alert>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <FormField
              id="fullName"
              label="Full Name"
              required
              error={errors.fullName}
              helperText="Your legal or official college name"
            >
              <Input
                name="fullName"
                placeholder="e.g. Aarav Sharma"
                value={formData.fullName}
                onChange={handleChange}
                autoComplete="name"
              />
            </FormField>

            <FormField
              id="email"
              label="College Email Address"
              required
              error={errors.email}
              helperText="Must be your official university domain (.ac.in, .edu)"
            >
              <Input
                type="email"
                name="email"
                placeholder="aarav@college.ac.in"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
              />
            </FormField>

            <FormField
              id="password"
              label="Password"
              required
              error={errors.password}
              helperText="Must be at least 8 characters long"
            >
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Create a strong password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs font-medium text-slate-500 hover:text-slate-800 p-1 pointer-events-auto cursor-pointer"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                }
              />
            </FormField>

            {/* Consent Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  id="consent"
                  type="checkbox"
                  name="consent"
                  checked={formData.consent}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-xs text-slate-600 leading-relaxed">
                  I certify that I am a college student and I agree to the{' '}
                  <span className="text-teal-700 underline font-medium">Terms of Service</span> and{' '}
                  <span className="text-teal-700 underline font-medium">Privacy Policy</span>.
                </span>
              </label>
              {errors.consent && (
                <p role="alert" className="text-xs text-rose-600 mt-1">
                  {errors.consent}
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              className="mt-4"
              isLoading={isSubmitting}
            >
              Create Account & Send OTP
            </Button>
          </form>
        </Card.Body>

        <Card.Footer className="justify-center text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-teal-700 hover:text-teal-800 font-semibold underline ml-1"
          >
            Log in
          </Link>
        </Card.Footer>
      </Card>
    </div>
  );
}
