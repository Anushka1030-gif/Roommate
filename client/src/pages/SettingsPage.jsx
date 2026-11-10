import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import DeleteAccountModal from '../components/settings/DeleteAccountModal.jsx';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [profileData, setProfileData] = useState(null);
  const [profileComplete, setProfileComplete] = useState(false);
  const [completenessPercent, setCompletenessPercent] = useState(0);
  const [loading, setLoading] = useState(true);

  // Phone settings form state
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState(null);
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [phoneSuccess, setPhoneSuccess] = useState(null);

  // Blocked users state
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [unblockingId, setUnblockingId] = useState(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Delete account modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

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

    async function fetchBlockedUsers() {
      try {
        setLoadingBlocks(true);
        const res = await api.get('/api/blocks');
        if (isMounted) {
          setBlockedUsers(res.data?.blocks || []);
        }
      } catch {
        // Non-critical background fetch failure
      } finally {
        if (isMounted) setLoadingBlocks(false);
      }
    }

    fetchProfile();
    fetchBlockedUsers();

    return () => {
      isMounted = false;
    };
  }, [showToast]);

  const handleUnblock = async (blockedUserId, displayName) => {
    try {
      setUnblockingId(blockedUserId);
      await api.delete(`/api/blocks/${blockedUserId}`);
      setBlockedUsers((prev) => prev.filter((b) => b.blocked_user_id !== blockedUserId));
      showToast({
        type: 'success',
        title: 'User Unblocked',
        message: `${displayName || 'Student'} has been unblocked.`,
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Unblock Failed',
        message: getErrorMessage(err, 'Failed to unblock user. Please try again.'),
      });
    } finally {
      setUnblockingId(null);
    }
  };

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

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError('Current password is required.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation password do not match.');
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError('New password must be different from current password.');
      return;
    }

    try {
      setIsChangingPassword(true);
      const res = await api.post('/api/account/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });

      setPasswordSuccess(res.data?.message || 'Password changed successfully.');
      showToast({
        type: 'success',
        title: 'Password Changed',
        message: 'Your password has been updated successfully.',
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to change password. Please verify current password.');
      setPasswordError(msg);
      showToast({
        type: 'error',
        title: 'Password Change Failed',
        message: msg,
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccountConfirm = async (password) => {
    try {
      setIsDeletingAccount(true);
      await api.delete('/api/account', {
        data: { password },
      });

      showToast({
        type: 'success',
        title: 'Account Deleted',
        message: 'Your account and data have been permanently removed.',
      });

      setIsDeleteModalOpen(false);
      await logout();
      navigate('/');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6 sm:py-10 px-4 sm:px-0 space-y-6 sm:space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Account & Profile Settings
        </h1>
        <p className="text-slate-600 text-sm mt-1">
          Manage your student profile preferences, housing criteria, and account security.
        </p>
      </div>

      {/* 1. Profile Overview Section (Edit Profile Link) */}
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
              <strong>Privacy Notice:</strong> Only verified students you match with can view your profile.
            </span>
          </div>
        </Card.Body>
      </Card>

      {/* 2. Housing Requirements Section (Edit Requirement Link) */}
      <Card className="shadow-md border-slate-200">
        <Card.Header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <Card.Title as="h2" className="text-xl font-bold text-slate-900">
              Housing & Roommate Criteria
            </Card.Title>
            <Card.Description>
              Your city, budget range, preferred room types, and custom lifestyle importance weights.
            </Card.Description>
          </div>

          <Link to="/requirement">
            <Button variant="outline" size="sm">
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Edit Criteria
            </Button>
          </Link>
        </Card.Header>
        <Card.Body className="pt-2 text-xs text-slate-500">
          Updating your criteria automatically re-evaluates candidate compatibility and updates your match recommendations.
        </Card.Body>
      </Card>

      {/* 3. Account Contact Phone Card */}
      <Card className="shadow-md border-slate-200">
        <Card.Header>
          <Card.Title as="h2" className="text-xl font-bold text-slate-900">
            Contact Phone Number
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
            <Alert variant="danger" onClose={() => setPhoneError(null)} className="mb-4">
              {phoneError}
            </Alert>
          )}

          <form onSubmit={handleUpdatePhone} className="space-y-4">
            <FormField
              id="settings-phone"
              label="Contact Phone"
              helperText="Format: +91 98765 43210 or 10-14 digits"
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

      {/* 4. Change Password Section */}
      <Card className="shadow-md border-slate-200">
        <Card.Header>
          <Card.Title as="h2" className="text-xl font-bold text-slate-900">
            Change Password
          </Card.Title>
          <Card.Description>
            Ensure your account remains secure with a strong, unique password (minimum 8 characters).
          </Card.Description>
        </Card.Header>

        <Card.Body className="pt-2">
          {passwordSuccess && (
            <Alert variant="success" onClose={() => setPasswordSuccess(null)} className="mb-4">
              {passwordSuccess}
            </Alert>
          )}

          {passwordError && (
            <Alert variant="danger" onClose={() => setPasswordError(null)} className="mb-4">
              {passwordError}
            </Alert>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <FormField
              id="current-password"
              label="Current Password"
            >
              <Input
                type="password"
                name="currentPassword"
                placeholder="Enter your current password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (passwordError) setPasswordError(null);
                }}
                autoComplete="current-password"
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                id="new-password"
                label="New Password"
                helperText="Minimum 8 characters"
              >
                <Input
                  type="password"
                  name="newPassword"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (passwordError) setPasswordError(null);
                  }}
                  autoComplete="new-password"
                />
              </FormField>

              <FormField
                id="confirm-password"
                label="Confirm New Password"
              >
                <Input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (passwordError) setPasswordError(null);
                  }}
                  autoComplete="new-password"
                />
              </FormField>
            </div>

            <Button
              type="submit"
              variant="outline"
              size="md"
              isLoading={isChangingPassword}
              disabled={!currentPassword || !newPassword || !confirmPassword}
            >
              Update Password
            </Button>
          </form>
        </Card.Body>
      </Card>

      {/* 5. Blocked Users Section */}
      <Card className="shadow-md border-slate-200">
        <Card.Header>
          <div className="flex items-center gap-2">
            <Card.Title as="h2" className="text-xl font-bold text-slate-900">
              Blocked Users
            </Card.Title>
            {blockedUsers.length > 0 && (
              <Badge variant="neutral" size="sm">
                {blockedUsers.length}
              </Badge>
            )}
          </div>
          <Card.Description>
            Users you have blocked cannot message you, view your contact details, or appear in your matches.
          </Card.Description>
        </Card.Header>

        <Card.Body className="pt-2">
          {loadingBlocks ? (
            <div className="py-6 text-center">
              <Spinner size="sm" className="mx-auto text-teal-600" />
            </div>
          ) : blockedUsers.length === 0 ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
              You haven&apos;t blocked any users.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {blockedUsers.map((item) => (
                <li
                  key={item.block_id || item.blocked_user_id}
                  className="p-3.5 bg-white flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 text-sm shrink-0">
                      {(item.display_name || 'S')[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {item.display_name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Blocked on {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    isLoading={unblockingId === item.blocked_user_id}
                    onClick={() => handleUnblock(item.blocked_user_id, item.display_name)}
                    className="shrink-0"
                  >
                    Unblock
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card.Body>
      </Card>

      {/* 6. Account Info & Security Summary */}
      <Card className="shadow-md border-slate-200">
        <Card.Header>
          <Card.Title as="h2" className="text-xl font-bold text-slate-900">
            Account Status & Details
          </Card.Title>
        </Card.Header>
        <Card.Body className="pt-2 text-sm text-slate-600 space-y-2">
          <div><span className="font-semibold text-slate-800">Email:</span> {user?.email}</div>
          <div><span className="font-semibold text-slate-800">Role:</span> {user?.role}</div>
          <div><span className="font-semibold text-slate-800">Account Status:</span> {user?.status}</div>
          <div><span className="font-semibold text-slate-800">Verified Campus Email:</span> {user?.email_verified ? 'Yes' : 'No'}</div>
        </Card.Body>
      </Card>

      {/* 7. Danger Zone: Delete Account */}
      <div className="rounded-2xl border border-rose-300 bg-rose-50/40 p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-rose-900">Danger Zone</h2>
          <p className="text-xs text-rose-700 mt-0.5">
            Permanently delete your account and personal data.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white rounded-xl border border-rose-200 shadow-xs">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Deactivate and Delete Account
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 max-w-md">
              Permanently removes your profile, requirements, and match results. Messages you sent will be replaced with &quot;[deleted]&quot;.
            </p>
          </div>

          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => setIsDeleteModalOpen(true)}
            className="shrink-0"
          >
            Delete Account
          </Button>
        </div>
      </div>

      {/* Delete Account Modal */}
      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteAccountConfirm}
        loading={isDeletingAccount}
      />
    </div>
  );
}
