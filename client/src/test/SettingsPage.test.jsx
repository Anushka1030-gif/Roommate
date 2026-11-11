import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SettingsPage from '../pages/SettingsPage.jsx';
import AuthContext from '../context/authContext.js';
import ToastContext from '../context/toastContext.js';
import api from '../services/api.js';

vi.mock('../services/api.js', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('SettingsPage Component', () => {
  const mockShowToast = vi.fn();
  const mockLogout = vi.fn().mockResolvedValue();

  const defaultUser = {
    id: 1,
    full_name: 'Aarav Sharma',
    email: 'aarav@manit.ac.in',
    email_verified: true,
    role: 'student',
    status: 'active',
  };

  const renderComponent = () => {
    return render(
      <AuthContext.Provider
        value={{
          user: defaultUser,
          isAuthenticated: true,
          isVerified: true,
          logout: mockLogout,
        }}
      >
        <ToastContext.Provider value={{ showToast: mockShowToast }}>
          <MemoryRouter initialEntries={['/settings']}>
            <SettingsPage />
          </MemoryRouter>
        </ToastContext.Provider>
      </AuthContext.Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders student profile card with edit button, privacy note, and criteria link', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        profile: {
          full_name: 'Aarav Sharma',
          college_name: 'MANIT Bhopal',
          major: 'Computer Science',
          graduation_year: 2026,
          city: 'Bhopal',
        },
        profile_complete: true,
        completeness_percentage: 100,
      },
    });

    renderComponent();

    expect(await screen.findByRole('heading', { name: /student profile/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /edit student profile/i })).toHaveAttribute(
      'href',
      '/onboarding/profile'
    );
    expect(await screen.findByText('Complete')).toBeInTheDocument();
    expect(screen.getByText(/only verified students you match with can view your profile/i)).toBeInTheDocument();

    // Verify Criteria Section
    expect(screen.getByRole('heading', { name: /housing & roommate criteria/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /edit criteria/i })).toHaveAttribute('href', '/requirement');
  });

  it('updates account phone number with validation', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        profile: {},
        profile_complete: false,
        completeness_percentage: 10,
      },
    });

    api.put.mockResolvedValueOnce({
      data: {
        message: 'Phone number updated successfully.',
      },
    });

    renderComponent();

    const phoneInput = await screen.findByLabelText(/contact phone/i);
    const updateBtn = screen.getByRole('button', { name: /update phone number/i });

    // Try invalid phone
    fireEvent.change(phoneInput, { target: { value: '123' } });
    fireEvent.click(updateBtn);
    expect((await screen.findAllByText(/please enter a valid phone number/i)).length).toBeGreaterThan(0);

    // Valid phone
    fireEvent.change(phoneInput, { target: { value: '+919876543210' } });
    fireEvent.click(updateBtn);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/api/account/phone', { phone: '+919876543210' });
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          title: 'Phone Updated',
        })
      );
    });
  });

  it('changes password with client validation and API call', async () => {
    api.get.mockResolvedValueOnce({
      data: { profile: {}, profile_complete: true, completeness_percentage: 100 },
    });

    api.post.mockResolvedValueOnce({
      data: { success: true, message: 'Password changed successfully.' },
    });

    renderComponent();

    const currentPwdInput = await screen.findByLabelText(/current password/i);
    const newPwdInput = screen.getByLabelText(/^new password/i);
    const confirmPwdInput = screen.getByLabelText(/confirm new password/i);
    const updatePwdBtn = screen.getByRole('button', { name: /update password/i });

    // Fill form
    fireEvent.change(currentPwdInput, { target: { value: 'OldPassword123!' } });
    fireEvent.change(newPwdInput, { target: { value: 'NewSecurePassword456!' } });
    fireEvent.change(confirmPwdInput, { target: { value: 'NewSecurePassword456!' } });

    fireEvent.click(updatePwdBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/account/change-password', {
        current_password: 'OldPassword123!',
        new_password: 'NewSecurePassword456!',
      });
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          title: 'Password Changed',
        })
      );
    });
  });

  it('opens delete account modal, requires confirmation checkbox and password, and calls DELETE /api/account', async () => {
    api.get.mockResolvedValueOnce({
      data: { profile: {}, profile_complete: true, completeness_percentage: 100 },
    });

    api.delete.mockResolvedValueOnce({
      data: { success: true, message: 'Your account has been permanently deactivated.' },
    });

    renderComponent();

    // Click Danger Zone Delete Account button
    const deleteBtn = await screen.findByRole('button', { name: /^delete account$/i });
    fireEvent.click(deleteBtn);

    // Modal opens
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /delete your account\?/i })).toBeInTheDocument();
    });

    const confirmModalBtn = screen.getByRole('button', { name: /permanently delete account/i });
    expect(confirmModalBtn).toBeDisabled();

    // Enter password
    const pwdInput = screen.getByPlaceholderText(/enter your account password/i);
    fireEvent.change(pwdInput, { target: { value: 'MyPassword123!' } });

    // Check confirmation checkbox
    const checkbox = screen.getByTestId('delete-confirm-checkbox');
    fireEvent.click(checkbox);
    expect(confirmModalBtn).not.toBeDisabled();

    fireEvent.click(confirmModalBtn);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/api/account', {
        data: { password: 'MyPassword123!' },
      });
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          title: 'Account Deleted',
        })
      );
      expect(mockLogout).toHaveBeenCalled();
    });
  });
});
