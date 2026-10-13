import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import api from '../services/api.js';
import { getErrorMessage } from '../utils/error.js';
import Card from '../components/ui/Card.jsx';
import Button from '../components/ui/Button.jsx';
import Badge from '../components/ui/Badge.jsx';
import Input from '../components/ui/Input.jsx';
import FormField from '../components/ui/FormField.jsx';
import Alert from '../components/ui/Alert.jsx';
import Spinner from '../components/ui/Spinner.jsx';

export default function SettingsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [profileData, setProfileData] = useState(null);
  const [profileComplete, setProfileComplete] = useState(false);
  const [completenessPercent, setCompletenessPercent] = useState(0);
  const [loading, setLoading] = useState(true);

  // Phone settings form state
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState(null);
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [phoneSuccess, setPhoneSuccess] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchProfile() {
      try {
        setLoading(true);
        const res = await api.get('/profile/me');
        if (isMounted) {
          setProfileData(res.data?.profile || null);
          setProfileComplete(Boolean(res.data?.profile_complete));
          setCompletenessPercent(res.data?.completeness_percentage || 0);
        }
      } catch (err) {
        if (isMounted) {
          showToast({
            type: 'error',
            title: 'Failed to load profile',
            message: getErrorMessage(err),
          });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [showToast]);

  const handleUpdatePhone = async (e) => {
    e.preventDefault();
    setPhoneError(null);
    setPhoneSuccess(null);

    const trimmedPhone = phone.trim();
    if (trimmedPhone) {
      const phoneRegex = /^(\+?[0-9]{1,4}[\s-]?)?([0-9]{10,14})$/;
      if (!phoneRegex.test(trimmedPhone)) {
        setPhoneError('Please enter a valid phone number (10 to 14 digits).');
        return;
      }
    }

    try {
      setIsSavingPhone(true);
      const res = await api.put('/api/account/phone', { phone: trimmedPhone || null });
      setPhoneSuccess(res.data?.message || 'Phone number updated successfully.');
      showToast({
        type: 'success',
        title: 'Phone Updated',
        message: 'Your contact phone has been updated securely.',
      });
      setPhone('');
    } catch (err) {
      setPhoneError(getErrorMessage(err));
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: getErrorMessage(err),
      });
    } finally {
      setIsSavingPhone(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6 sm:py-10 px-4 sm:px-0 space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Account & Profile Settings
        </h1>
        <p className="text-slate-600 text-sm mt-1">
          Manage your student profile preferences, privacy settings, and account details.
        </p>
      </div>

      {/* Profile Overview Card (Entry Point to Profile Edit) */}
      <Card className="shadow-md border-slate-200">
        <Card.Header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Card.Title as="h2" className="text-xl font-bold text-slate-900">
                Student Profile
              </Card.Title>
              <Badge variant={profileComplete ? 'success' : 'warning'} size="sm">
                {profileComplete ? 'Complete' : `${completenessPercent}% Complete`}
              </Badge>
            </div>
            <Card.Description>
              Your living habits, schedule, and preferences used to find compatible roommates.
            </Card.Description>
          </div>

          <Link to="/onboarding/profile">
            <Button variant="primary" size="sm">
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Student Profile
            </Button>
          </Link>
        </Card.Header>

        <Card.Body className="pt-4 space-y-4">
          {loading ? (
            <div className="py-6 text-center">
              <Spinner size="md" className="mx-auto text-teal-600" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-400 font-medium block">Full Name</span>
                <span className="font-semibold text-slate-800">
                  {profileData?.full_name || user?.full_name || 'Not set'}
                </span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-400 font-medium block">College / University</span>
                <span className="font-semibold text-slate-800">
                  {profileData?.college_name || 'Not set'}
                </span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-400 font-medium block">Major & Grad Year</span>
                <span className="font-semibold text-slate-800">
                  {profileData?.major ? `${profileData.major} (${profileData.graduation_year || ''})` : 'Not set'}
                </span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-400 font-medium block">City</span>
                <span className="font-semibold text-slate-800">
                  {profileData?.city || 'Bhopal'}
                </span>
              </div>
            </div>
          )}

          {/* Privacy Note */}
          <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900 flex items-center gap-2">
            <svg className="w-4 h-4 text-teal-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>
              <strong>Privacy Notice:</strong> Only verified students you match with can see your profile.
            </span>
          </div>
        </Card.Body>
      </Card>

      {/* Account Contact Phone Card */}
      <Card className="shadow-md border-slate-200">
        <Card.Header>
          <Card.Title as="h2" className="text-xl font-bold text-slate-900">
            Account Phone Number
          </Card.Title>
          <Card.Description>
            Optional phone number. Kept private and only revealed upon mutual roommate confirmation.
          </Card.Description>
        </Card.Header>

        <Card.Body className="pt-2">
          {phoneSuccess && (
            <Alert variant="success" onClose={() => setPhoneSuccess(null)} className="mb-4">
              {phoneSuccess}
            </Alert>
          )}

          {phoneError && (
            <Alert variant="error" onClose={() => setPhoneError(null)} className="mb-4">
              {phoneError}
            </Alert>
          )}

          <form onSubmit={handleUpdatePhone} className="space-y-4">
            <FormField
              id="settings-phone"
              label="Contact Phone"
              hint="Format: +91 98765 43210 or 10-14 digits"
              error={phoneError}
            >
              <Input
                type="tel"
                name="phone"
                placeholder="Enter new phone number"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (phoneError) setPhoneError(null);
                }}
              />
            </FormField>

            <Button
              type="submit"
              variant="outline"
              size="md"
              isLoading={isSavingPhone}
            >
              Update Phone Number
            </Button>
          </form>
        </Card.Body>
      </Card>

      {/* Account Info Card */}
      <Card className="shadow-md border-slate-200">
        <Card.Header>
          <Card.Title as="h2" className="text-xl font-bold text-slate-900">
            Account Security & Credentials
          </Card.Title>
        </Card.Header>
        <Card.Body className="pt-2 text-sm text-slate-600 space-y-2">
          <div><span className="font-semibold text-slate-800">Email:</span> {user?.email}</div>
          <div><span className="font-semibold text-slate-800">Role:</span> {user?.role}</div>
          <div><span className="font-semibold text-slate-800">Status:</span> {user?.status}</div>
          <div><span className="font-semibold text-slate-800">Verified Student:</span> {user?.email_verified ? 'Yes' : 'No'}</div>
        </Card.Body>
      </Card>
    </div>
  );
}
