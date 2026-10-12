import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { getErrorMessage, getErrorCode } from '../utils/error.js';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import FormField from '../components/ui/FormField.jsx';
import Card from '../components/ui/Card.jsx';
import Alert from '../components/ui/Alert.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: location.state?.verifiedEmail || location.state?.email || '',
    password: '',
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Success notice if redirected from verification or registration
  const [infoMessage, setInfoMessage] = useState(
    location.state?.message || null
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
    if (serverError) {
      setServerError(null);
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);
    setInfoMessage(null);

    if (!validate()) return;

    try {
      setIsSubmitting(true);
      const email = formData.email.trim().toLowerCase();
      const response = await login({ email, password: formData.password });
      const loggedInUser = response.user;

      // Redirect rules: unverified -> /verify-email; verified -> /onboarding/profile (or previous destination)
      if (!loggedInUser.email_verified) {
        navigate('/verify-email', {
          state: { email, message: 'Please verify your student email to continue.' },
          replace: true,
        });
      } else {
        const destination = location.state?.from?.pathname || '/onboarding/profile';
        navigate(destination, { replace: true });
      }
    } catch (err) {
      const code = getErrorCode(err);
      const message = getErrorMessage(err);

      if (code === 'USER_SUSPENDED') {
        setServerError('Your account has been suspended by administration. Please contact support.');
      } else if (code === 'INVALID_CREDENTIALS') {
        setServerError('Invalid email or password. Please verify your credentials and try again.');
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
                d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
              />
            </svg>
          </div>
          <Card.Title as="h1" className="text-2xl font-bold">
            Welcome Back
          </Card.Title>
          <Card.Description>
            Log in to your RoomieMatch account to find your next roommate.
          </Card.Description>
        </Card.Header>

        <Card.Body className="pt-2">
          {infoMessage && (
            <Alert variant="success" title="Notice" onClose={() => setInfoMessage(null)} className="mb-6">
              {infoMessage}
            </Alert>
          )}

          {serverError && (
            <Alert variant="error" title="Sign In Error" onClose={() => setServerError(null)} className="mb-6">
              {serverError}
            </Alert>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <FormField
              id="login-email"
              label="College Email Address"
              required
              error={errors.email}
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
              id="login-password"
              label="Password"
              required
              error={errors.password}
            >
              <Input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
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

            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              className="mt-4"
              isLoading={isSubmitting}
            >
              Sign In
            </Button>
          </form>
        </Card.Body>

        <Card.Footer className="justify-center text-center text-sm text-slate-600">
          Don&apos;t have an account yet?{' '}
          <Link
            to="/register"
            className="text-teal-700 hover:text-teal-800 font-semibold underline ml-1"
          >
            Create account
          </Link>
        </Card.Footer>
      </Card>
    </div>
  );
}
