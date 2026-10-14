import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RequirementPage from '../pages/RequirementPage.jsx';
import AuthContext from '../context/authContext.js';
import ToastContext from '../context/toastContext.js';
import api from '../services/api.js';

vi.mock('../services/api.js', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('RequirementPage Component', () => {
  const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  };

  const defaultUser = {
    id: 1,
    full_name: 'Aarav Sharma',
    email: 'aarav@manit.ac.in',
    email_verified: true,
    profile_completed: true,
    role: 'student',
    status: 'active',
  };

  const defaultProfile = {
    full_name: 'Aarav Sharma',
    city: 'Bhopal',
    profile_completed: true,
  };

  const activeRequirement = {
    id: 42,
    user_id: 1,
    city: 'Bhopal',
    budget_min: 6000,
    budget_max: 12000,
    move_in_date: '2026-12-01',
    gender_preference: 'same_gender_only',
    preferred_sleep_schedule: 'early_bird',
    preferred_cleanliness_min: 4,
    smoking_ok: false,
    drinking_ok: true,
    food_preference: 'vegetarian_only',
    guests_ok: 'rarely',
    noise_tolerance: 'quiet',
    deal_breakers: 'No late night music or pets.',
    importance_weights: {
      cleanliness: 3,
      sleep: 3,
      smoking: 3,
      drinking: 2,
      food: 3,
      guests: 2,
      noise: 3,
      social: 1,
    },
    is_active: true,
  };

  const renderComponent = (user = defaultUser) => {
    return render(
      <AuthContext.Provider
        value={{
          user,
          isAuthenticated: Boolean(user),
          isVerified: Boolean(user?.email_verified),
        }}
      >
        <ToastContext.Provider value={{ toast: mockToast, addToast: vi.fn(), removeToast: vi.fn() }}>
          <MemoryRouter initialEntries={['/requirement']}>
            <Routes>
              <Route path="/requirement" element={<RequirementPage />} />
              <Route path="/matches" element={<div>Matches Page Target</div>} />
              <Route path="/onboarding/profile" element={<div>Profile Onboarding Target</div>} />
            </Routes>
          </MemoryRouter>
        </ToastContext.Provider>
      </AuthContext.Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all four sections of the requirement form', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/requirements/active') {
        return Promise.resolve({ data: { requirement: null } });
      }
      if (url === '/profile/me') {
        return Promise.resolve({ data: { profile: defaultProfile, profile_complete: true } });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    renderComponent();

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Housing & Roommate Requirements/i);
    });

    // Check all 4 sections
    expect(screen.getByText('Budget and Location')).toBeInTheDocument();
    expect(screen.getByText('Lifestyle Preferences')).toBeInTheDocument();
    expect(screen.getByText('Deal-Breakers')).toBeInTheDocument();
    expect(screen.getByText('How Much Each Thing Matters')).toBeInTheDocument();

    // Verify importance weights dimensions rendered
    expect(screen.getByText('Cleanliness & Tidiness')).toBeInTheDocument();
    expect(screen.getByText('Sleep & Quiet Hours')).toBeInTheDocument();
    expect(screen.getByText('Smoking Habits')).toBeInTheDocument();
    expect(screen.getByText('Noise & Study Atmosphere')).toBeInTheDocument();

    // Submit button
    expect(screen.getByRole('button', { name: /Save Requirements & Find Matches/i })).toBeInTheDocument();
  });

  it('prefills active requirement when one already exists', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/requirements/active') {
        return Promise.resolve({ data: { requirement: activeRequirement } });
      }
      if (url === '/profile/me') {
        return Promise.resolve({ data: { profile: defaultProfile, profile_complete: true } });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Editing Active Requirement/i)).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('6000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('12000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('No late night music or pets.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Update Requirements & Find Matches/i })).toBeInTheDocument();
  });

  it('shows inline validation error when budget_max is less than budget_min', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/requirements/active') {
        return Promise.resolve({ data: { requirement: null } });
      }
      if (url === '/profile/me') {
        return Promise.resolve({ data: { profile: defaultProfile, profile_complete: true } });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByLabelText(/Minimum Monthly Budget/i)).toBeInTheDocument();
    });

    const minInput = screen.getByLabelText(/Minimum Monthly Budget/i);
    const maxInput = screen.getByLabelText(/Maximum Monthly Budget/i);

    fireEvent.change(minInput, { target: { value: '15000' } });
    fireEvent.change(maxInput, { target: { value: '10000' } });

    await waitFor(() => {
      expect(
        screen.getByText(/Maximum budget must be greater than or equal to minimum budget/i)
      ).toBeInTheDocument();
    });
  });

  it('submits requirement and navigates to /matches on success', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/requirements/active') {
        return Promise.resolve({ data: { requirement: null } });
      }
      if (url === '/profile/me') {
        return Promise.resolve({ data: { profile: defaultProfile, profile_complete: true } });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    api.post.mockResolvedValueOnce({
      data: {
        message: 'Requirement saved successfully.',
        requirement: { id: 101, is_active: 1 },
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Save Requirements & Find Matches/i })).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole('button', { name: /Save Requirements & Find Matches/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/requirements',
        expect.objectContaining({
          budget_min: 5000,
          budget_max: 10000,
          city: 'Bhopal',
          gender_preference: 'same_gender_only',
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Matches Page Target')).toBeInTheDocument();
    });
  });

  it('redirects to /onboarding/profile if profile is incomplete', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/requirements/active') {
        const err = new Error('Profile incomplete');
        err.response = { data: { error: { code: 'PROFILE_INCOMPLETE', message: 'Incomplete' } } };
        return Promise.reject(err);
      }
      if (url === '/profile/me') {
        return Promise.resolve({ data: { profile: { full_name: 'Test' }, profile_complete: false } });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Profile Onboarding Target')).toBeInTheDocument();
    });
  });
});
