import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProfileOnboardingPage from '../pages/ProfileOnboardingPage.jsx';
import AuthContext from '../context/authContext.js';
import ToastContext from '../context/toastContext.js';
import api from '../services/api.js';

vi.mock('../services/api.js', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
  },
}));

describe('ProfileOnboardingPage Component', () => {
  const mockShowToast = vi.fn();
  const mockRefreshUser = vi.fn();

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
          refreshUser: mockRefreshUser,
          isAuthenticated: true,
          isVerified: true,
        }}
      >
        <ToastContext.Provider value={{ showToast: mockShowToast }}>
          <MemoryRouter initialEntries={['/onboarding/profile']}>
            <ProfileOnboardingPage />
          </MemoryRouter>
        </ToastContext.Provider>
      </AuthContext.Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders progress indicator, privacy note, and prefilled user details', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        profile: {
          full_name: 'Aarav Sharma',
          age: 21,
          gender: 'male',
          college_name: 'MANIT Bhopal',
          major: 'Computer Science',
          graduation_year: 2026,
          city: 'Bhopal',
          cleanliness_level: 3,
        },
        profile_complete: false,
        completeness_percentage: 44,
      },
    });

    renderComponent();

    // Check privacy notice
    expect(
      await screen.findByText(/only verified students you match with can see your profile/i)
    ).toBeInTheDocument();

    // Check heading and step titles
    expect(screen.getByRole('heading', { name: /student profile setup/i })).toBeInTheDocument();
    expect(screen.getByText('Basics')).toBeInTheDocument();
    expect(screen.getByText('Lifestyle')).toBeInTheDocument();
    expect(screen.getByText('Habits')).toBeInTheDocument();
    expect(screen.getByText('About you')).toBeInTheDocument();

    // Check prefilled inputs
    expect(screen.getByLabelText(/full name/i)).toHaveValue('Aarav Sharma');
    expect(screen.getByLabelText(/age/i)).toHaveValue(21);
    expect(screen.getByLabelText(/major \/ degree program/i)).toHaveValue('Computer Science');
  });

  it('validates Step 1 fields when values are invalid', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        profile: {
          full_name: '',
          age: null,
          gender: '',
          college_name: '',
          major: '',
          graduation_year: 2026,
          city: 'Bhopal',
        },
        profile_complete: false,
        completeness_percentage: 6,
      },
    });

    renderComponent();

    const nameInput = await screen.findByLabelText(/full name/i);
    fireEvent.change(nameInput, { target: { value: '' } });

    const nextBtn = screen.getByRole('button', { name: /next step/i });
    fireEvent.click(nextBtn);

    expect(await screen.findByText(/full name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/age is required/i)).toBeInTheDocument();
    expect(screen.getByText(/please select your gender/i)).toBeInTheDocument();
  });

  it('validates age bounds between 17 and 40', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        profile: {
          full_name: 'Test Student',
          age: 15,
          gender: 'male',
          college_name: 'MANIT',
          major: 'CS',
          graduation_year: 2026,
          city: 'Bhopal',
        },
        profile_complete: false,
        completeness_percentage: 30,
      },
    });

    renderComponent();

    const ageInput = await screen.findByLabelText(/age/i);
    fireEvent.change(ageInput, { target: { value: '15' } });

    fireEvent.click(screen.getByRole('button', { name: /next step/i }));
    expect(await screen.findByText(/age must be between 17 and 40/i)).toBeInTheDocument();
  });

  it('navigates through steps to Step 4 and submits complete profile', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        profile: {
          full_name: 'Aarav Sharma',
          age: 21,
          gender: 'male',
          college_name: 'MANIT Bhopal',
          major: 'Computer Science',
          graduation_year: 2026,
          city: 'Bhopal',
          sleep_schedule: 'early_bird',
          cleanliness_level: 4,
          noise_level: 'quiet',
          guest_policy: 'rarely',
          study_habits: 'silent',
          food_preference: 'vegetarian',
          smoking_preference: 'no',
          drinking_preference: 'no',
          pet_preference: 'no_pets',
          bio: 'Looking for a tidy flatmate.',
        },
        profile_complete: true,
        completeness_percentage: 100,
      },
    });

    api.put.mockResolvedValueOnce({
      data: {
        profile: {
          full_name: 'Aarav Sharma',
          profile_completed: true,
        },
        profile_complete: true,
        completeness_percentage: 100,
      },
    });

    renderComponent();

    // Move to step 2
    const nextBtn1 = await screen.findByRole('button', { name: /next step/i });
    fireEvent.click(nextBtn1);

    // Now on Step 2 (Lifestyle)
    expect(await screen.findByText(/lifestyle & living preferences/i)).toBeInTheDocument();
    expect(screen.getByText(/cleanliness level \(1 to 5\)/i)).toBeInTheDocument();
    expect(screen.getByText(/1 = relaxed & casual, 5 = spotless & neat freak/i)).toBeInTheDocument();

    // Move to step 3
    const nextBtn2 = screen.getByRole('button', { name: /next step/i });
    fireEvent.click(nextBtn2);

    // Now on Step 3 (Habits)
    expect(await screen.findByText(/study, dietary & social habits/i)).toBeInTheDocument();

    // Move to step 4
    const nextBtn3 = screen.getByRole('button', { name: /next step/i });
    fireEvent.click(nextBtn3);

    // Now on Step 4 (About you)
    expect(await screen.findByText(/about you & contact/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/personal bio/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();

    // Submit profile
    const saveBtn = screen.getByRole('button', { name: /save & finish profile/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/profile/me',
        expect.objectContaining({
          full_name: 'Aarav Sharma',
          age: 21,
          cleanliness_level: 4,
          city: 'Bhopal',
        })
      );
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          title: 'Profile Saved',
        })
      );
    });
  });
});
