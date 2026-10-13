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
  },
}));

describe('SettingsPage Component', () => {
  const mockShowToast = vi.fn();

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

  it('renders student profile card with edit button and privacy note', async () => {
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
    expect(screen.getByText(/only verified students you match with can see your profile/i)).toBeInTheDocument();
    expect(screen.getByText('Complete')).toBeInTheDocument();
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
});
