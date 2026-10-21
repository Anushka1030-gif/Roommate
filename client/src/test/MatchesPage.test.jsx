import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import MatchesPage from '../pages/MatchesPage.jsx';
import AuthContext from '../context/authContext.js';
import ToastContext from '../context/toastContext.js';
import api from '../services/api.js';

vi.mock('../services/api.js', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('MatchesPage Component', () => {
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

  const sampleActiveRequirement = {
    id: 10,
    user_id: 1,
    city: 'Bhopal',
    budget_min: 7000,
    budget_max: 12000,
    preferred_sleep_schedule: 'early_bird',
    preferred_cleanliness_min: 4,
    gender_preference: 'same_gender_only',
  };

  const sampleMatches = [
    {
      id: 101,
      candidate_id: 2,
      score: 95,
      compatibility_score: 95,
      status: 'suggested',
      source: 'llm',
      explanation: 'Aarav and Rohan are both disciplined early birds with identical 4/5 cleanliness standards.',
      highlights: ['Matched early bird schedule', 'Identical cleanliness expectations'],
      watch_out: 'Rohan rarely hosts guests while you occasionally host friends.',
      icebreakers: ['Ask Rohan about his CSE projects at MANIT', 'Compare morning workout routines'],
      score_breakdown: {
        cleanliness: 95,
        sleep: 100,
        budget: 90,
        noise: 85,
        food: 95,
        habits: 90,
        social: 80,
        guests: 85,
      },
      user: {
        id: 2,
        full_name: 'Rohan Verma',
        age: 21,
        gender: 'male',
        college_name: 'MANIT Bhopal',
        major: 'Computer Science',
        graduation_year: 2026,
        city: 'Bhopal',
        bio: 'Coding enthusiast and fitness lover seeking a quiet, clean room.',
        sleep_schedule: 'early_bird',
        cleanliness_level: 4,
        study_habits: 'silent',
        noise_level: 'quiet',
        smoking_preference: 'never',
        drinking_preference: 'never',
        food_preference: 'vegetarian',
        guest_policy: 'rarely',
      },
    },
    {
      id: 102,
      candidate_id: 3,
      score: 88,
      compatibility_score: 88,
      status: 'suggested',
      source: 'fallback',
      explanation: 'Kabir shares a compatible budget and vegetarian dietary routine.',
      highlights: ['Comfortable budget overlap', 'Shared vegetarian lifestyle'],
      watch_out: null,
      icebreakers: ['Ask about library spots near campus', 'Discuss meal prep ideas'],
      score_breakdown: {
        cleanliness: 85,
        sleep: 80,
        budget: 95,
        noise: 90,
        food: 100,
        habits: 85,
        social: 85,
        guests: 80,
      },
      user: {
        id: 3,
        full_name: 'Kabir Mehta',
        age: 22,
        gender: 'male',
        college_name: 'IISER Bhopal',
        major: 'Natural Sciences',
        graduation_year: 2025,
        city: 'Bhopal',
        bio: 'Research student looking for respectful roommates.',
        sleep_schedule: 'flexible',
        cleanliness_level: 4,
        study_habits: 'silent',
        noise_level: 'quiet',
        smoking_preference: 'never',
        drinking_preference: 'never',
        food_preference: 'vegetarian',
        guest_policy: 'sometimes',
      },
    },
    {
      id: 103,
      candidate_id: 4,
      score: 82,
      compatibility_score: 82,
      status: 'suggested',
      source: 'fallback',
      explanation: 'Dev has a balanced study schedule and compatible quiet noise preference.',
      highlights: ['Quiet study environment', 'Shared non-smoker rule'],
      watch_out: 'Dev is a night owl which might require quiet hours negotiation.',
      icebreakers: ['Ask about weekend gaming sessions', 'Talk about best coffee shops'],
      score_breakdown: {
        cleanliness: 80,
        sleep: 70,
        budget: 90,
        noise: 85,
        food: 80,
        habits: 85,
        social: 80,
        guests: 80,
      },
      user: {
        id: 4,
        full_name: 'Dev Patel',
        age: 20,
        gender: 'male',
        college_name: 'AIIMS Bhopal',
        major: 'Medicine',
        graduation_year: 2027,
        city: 'Bhopal',
        bio: 'Med student needing quiet space for exam prep.',
        sleep_schedule: 'night_owl',
        cleanliness_level: 3,
        study_habits: 'silent',
        noise_level: 'quiet',
        smoking_preference: 'never',
        drinking_preference: 'never',
        food_preference: 'vegetarian',
        guest_policy: 'rarely',
      },
    },
  ];

  const renderComponent = () => {
    return render(
      <AuthContext.Provider
        value={{
          user: defaultUser,
          isAuthenticated: true,
          isVerified: true,
        }}
      >
        <ToastContext.Provider value={{ toast: mockToast, addToast: vi.fn(), removeToast: vi.fn() }}>
          <MemoryRouter initialEntries={['/matches']}>
            <Routes>
              <Route path="/matches" element={<MatchesPage />} />
              <Route path="/chats" element={<div>Chats Inbox View</div>} />
              <Route path="/requirement" element={<div>Requirement Form Target</div>} />
            </Routes>
          </MemoryRouter>
        </ToastContext.Provider>
      </AuthContext.Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders ranked match cards with compatibility badges, full names, colleges, and AI explanations', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/matches') {
        return Promise.resolve({
          data: {
            matches: sampleMatches,
            count: 3,
            has_enough_matches: true,
            message: null,
          },
        });
      }
      if (url === '/requirements/active') {
        return Promise.resolve({ data: { requirement: sampleActiveRequirement } });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    renderComponent();

    // Verify main page title
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Compatible Roommates/i);
    });

    // Verify candidates are rendered
    expect(screen.getByText('Rohan Verma')).toBeInTheDocument();
    expect(screen.getByText('Kabir Mehta')).toBeInTheDocument();
    expect(screen.getByText('Dev Patel')).toBeInTheDocument();

    // Verify colleges and majors
    expect(screen.getByText(/MANIT Bhopal/i)).toBeInTheDocument();
    expect(screen.getByText(/IISER Bhopal/i)).toBeInTheDocument();
    expect(screen.getByText(/AIIMS Bhopal/i)).toBeInTheDocument();

    // Verify score badges
    expect(screen.getByText('95%')).toBeInTheDocument();
    expect(screen.getByText('88%')).toBeInTheDocument();
    expect(screen.getByText('82%')).toBeInTheDocument();

    // Verify top ranked ribbon
    expect(screen.getByText(/TOP COMPATIBILITY MATCH/i)).toBeInTheDocument();

    // Verify AI explanation
    expect(screen.getByText(/Aarav and Rohan are both disciplined early birds/i)).toBeInTheDocument();

    // Verify highlight chips
    expect(screen.getByText('Matched early bird schedule')).toBeInTheDocument();

    // Verify watch-out note
    expect(screen.getByText(/Rohan rarely hosts guests while you occasionally host friends/i)).toBeInTheDocument();
  });

  it('STRICT PRIVACY: ensures candidate email and phone are NEVER present in document', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/matches') {
        return Promise.resolve({
          data: {
            matches: sampleMatches,
            count: 3,
            has_enough_matches: true,
          },
        });
      }
      if (url === '/requirements/active') {
        return Promise.resolve({ data: { requirement: sampleActiveRequirement } });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    const { container } = renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Rohan Verma')).toBeInTheDocument();
    });

    // Check that no emails or phones appear in html
    expect(container.textContent).not.toContain('@manit.ac.in');
    expect(container.textContent).not.toContain('phone');
    expect(container.textContent).not.toContain('+91');
  });

  it('allows user to like and unlike a match with optimistic UI update and API call', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/matches') {
        return Promise.resolve({
          data: {
            matches: sampleMatches,
            count: 3,
            has_enough_matches: true,
          },
        });
      }
      if (url === '/requirements/active') {
        return Promise.resolve({ data: { requirement: sampleActiveRequirement } });
      }
      return Promise.reject(new Error('Unknown url'));
    });
    api.patch.mockResolvedValue({ data: { success: true, status: 'liked' } });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Rohan Verma')).toBeInTheDocument();
    });

    const likeButtons = screen.getAllByRole('button', { name: /Like candidate/i });
    expect(likeButtons.length).toBeGreaterThan(0);

    // Click like on first candidate
    fireEvent.click(likeButtons[0]);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/matches/101/status', { status: 'liked' });
      expect(mockToast.success).toHaveBeenCalledWith(expect.stringContaining('Added Rohan Verma'));
    });
  });

  it('allows user to skip and restore a candidate', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/matches') {
        return Promise.resolve({
          data: {
            matches: sampleMatches,
            count: 3,
            has_enough_matches: true,
          },
        });
      }
      if (url === '/requirements/active') {
        return Promise.resolve({ data: { requirement: sampleActiveRequirement } });
      }
      return Promise.reject(new Error('Unknown url'));
    });
    api.patch.mockResolvedValue({ data: { success: true, status: 'skipped' } });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Rohan Verma')).toBeInTheDocument();
    });

    const skipButtons = screen.getAllByRole('button', { name: /Skip candidate/i });
    fireEvent.click(skipButtons[0]);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/matches/101/status', { status: 'skipped' });
      expect(mockToast.info).toHaveBeenCalledWith(expect.stringContaining('Skipped Rohan Verma'));
    });
  });

  it('filters matches dynamically via search input', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/matches') {
        return Promise.resolve({
          data: {
            matches: sampleMatches,
            count: 3,
            has_enough_matches: true,
          },
        });
      }
      if (url === '/requirements/active') {
        return Promise.resolve({ data: { requirement: sampleActiveRequirement } });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Rohan Verma')).toBeInTheDocument();
      expect(screen.getByText('Kabir Mehta')).toBeInTheDocument();
    });

    const searchInput = screen.getByRole('textbox', { name: /Search matches by name or college/i });
    fireEvent.change(searchInput, { target: { value: 'IISER' } });

    // Kabir Mehta should be visible, Rohan Verma should be filtered out
    expect(screen.getByText('Kabir Mehta')).toBeInTheDocument();
    expect(screen.queryByText('Rohan Verma')).not.toBeInTheDocument();
  });

  it('opens Connect modal when clicking Start Chat with AI icebreakers', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/matches') {
        return Promise.resolve({
          data: {
            matches: sampleMatches,
            count: 3,
            has_enough_matches: true,
          },
        });
      }
      if (url === '/requirements/active') {
        return Promise.resolve({ data: { requirement: sampleActiveRequirement } });
      }
      return Promise.reject(new Error('Unknown url'));
    });
    api.patch.mockResolvedValue({ data: { success: true, status: 'connected' } });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Rohan Verma')).toBeInTheDocument();
    });

    const startChatButtons = screen.getAllByRole('button', { name: /Start Chat/i });
    fireEvent.click(startChatButtons[0]);

    // Modal should open
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/Start Chat with Rohan Verma/i)).toBeInTheDocument();
      expect(screen.getByText(/Consent-first Privacy/i)).toBeInTheDocument();
      expect(screen.getByText(/Ask Rohan about his CSE projects at MANIT/i)).toBeInTheDocument();
    });
  });

  it('calls refresh matches API when clicking Refresh Matches button', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/matches') {
        return Promise.resolve({
          data: {
            matches: sampleMatches,
            count: 3,
            has_enough_matches: true,
          },
        });
      }
      if (url === '/requirements/active') {
        return Promise.resolve({ data: { requirement: sampleActiveRequirement } });
      }
      return Promise.reject(new Error('Unknown url'));
    });
    api.post.mockImplementation((url) => {
      if (url === '/matches/refresh') {
        return Promise.resolve({
          data: {
            matches: sampleMatches,
            count: 3,
            has_enough_matches: true,
          },
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Rohan Verma')).toBeInTheDocument();
    });

    const refreshBtn = screen.getByRole('button', { name: /Refresh matches/i });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/matches/refresh');
      expect(mockToast.success).toHaveBeenCalledWith('Matches refreshed successfully!');
    });
  });

  it('displays low candidate pool banner if has_enough_matches is false', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/matches') {
        return Promise.resolve({
          data: {
            matches: [sampleMatches[0]],
            count: 1,
            has_enough_matches: false,
            message: 'Not enough matches yet in your city. Check back soon as more students join!',
          },
        });
      }
      if (url === '/requirements/active') {
        return Promise.resolve({ data: { requirement: sampleActiveRequirement } });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Growing Community in Your City/i)).toBeInTheDocument();
      expect(screen.getByText(/Not enough matches yet in your city/i)).toBeInTheDocument();
    });
  });
});
