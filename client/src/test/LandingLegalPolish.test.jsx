import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HomePage from '../pages/HomePage.jsx';
import TermsPage from '../pages/TermsPage.jsx';
import PrivacyPage from '../pages/PrivacyPage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';
import ErrorBoundary from '../components/common/ErrorBoundary.jsx';
import AuthContext from '../context/authContext.js';

describe('Landing Page, Legal Pages, and Polish Components (Step 15)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('HomePage Component (Landing Page)', () => {
    it('renders hero with value proposition and get started CTA for unauthenticated visitors', () => {
      render(
        <AuthContext.Provider value={{ isAuthenticated: false, user: null }}>
          <MemoryRouter>
            <HomePage />
          </MemoryRouter>
        </AuthContext.Provider>
      );

      // Hero value proposition
      expect(
        screen.getByRole('heading', {
          level: 1,
          name: /find a roommate who actually fits your lifestyle/i,
        })
      ).toBeInTheDocument();

      // CTA buttons
      expect(
        screen.getAllByRole('link', { name: /get started with college email/i })[0]
      ).toHaveAttribute('href', '/register');
      expect(screen.getByRole('link', { name: /log in/i })).toHaveAttribute(
        'href',
        '/login'
      );

      // 3-step "How it works" section
      expect(screen.getByText(/how roomiematch works/i)).toBeInTheDocument();
      expect(screen.getByText(/create your profile/i)).toBeInTheDocument();
      expect(screen.getByText(/tell us what you want/i)).toBeInTheDocument();
      expect(screen.getByText(/meet your top 3 matches/i)).toBeInTheDocument();

      // Trust & safety section
      expect(screen.getByText(/built on student trust and privacy/i)).toBeInTheDocument();
      expect(screen.getByText(/verified college emails/i)).toBeInTheDocument();
      expect(screen.getByText(/you control your contact info/i)).toBeInTheDocument();

      // FAQ section
      expect(screen.getByText(/frequently asked questions/i)).toBeInTheDocument();
      expect(screen.getByText(/who can join roomiematch\?/i)).toBeInTheDocument();
    });

    it('directs authenticated visitors to their appropriate next step', () => {
      // 1. Unverified user -> verify email
      const { rerender } = render(
        <AuthContext.Provider
          value={{
            isAuthenticated: true,
            isVerified: false,
            user: { email: 'test@manit.ac.in', email_verified: false },
          }}
        >
          <MemoryRouter>
            <HomePage />
          </MemoryRouter>
        </AuthContext.Provider>
      );

      expect(
        screen.getAllByRole('link', { name: /verify student email/i })[0]
      ).toHaveAttribute('href', '/verify-email');

      // 2. Verified user with incomplete profile -> onboarding
      rerender(
        <AuthContext.Provider
          value={{
            isAuthenticated: true,
            isVerified: true,
            user: {
              email: 'test@manit.ac.in',
              email_verified: true,
              profile_completed: false,
            },
          }}
        >
          <MemoryRouter>
            <HomePage />
          </MemoryRouter>
        </AuthContext.Provider>
      );

      expect(
        screen.getAllByRole('link', { name: /complete your profile/i })[0]
      ).toHaveAttribute('href', '/onboarding/profile');

      // 3. Ready user with complete profile -> matches
      rerender(
        <AuthContext.Provider
          value={{
            isAuthenticated: true,
            isVerified: true,
            user: {
              email: 'test@manit.ac.in',
              email_verified: true,
              profile_completed: true,
            },
          }}
        >
          <MemoryRouter>
            <HomePage />
          </MemoryRouter>
        </AuthContext.Provider>
      );

      expect(
        screen.getAllByRole('link', { name: /explore your top matches/i })[0]
      ).toHaveAttribute('href', '/matches');
    });

    it('toggles FAQ accordion answers when clicked', () => {
      render(
        <AuthContext.Provider value={{ isAuthenticated: false, user: null }}>
          <MemoryRouter>
            <HomePage />
          </MemoryRouter>
        </AuthContext.Provider>
      );

      const faqQuestion = screen.getByText(/is roomiematch free for students\?/i);
      expect(screen.queryByText(/yes, 100% free/i)).not.toBeInTheDocument();

      fireEvent.click(faqQuestion);
      expect(screen.getByText(/yes, 100% free/i)).toBeInTheDocument();
    });
  });

  describe('Legal Pages (/terms and /privacy)', () => {
    it('renders TermsPage with DRAFT notice and student eligibility rules', () => {
      render(
        <MemoryRouter>
          <TermsPage />
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { level: 1, name: /terms of service/i })).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent(/draft notice/i);
      expect(screen.getByText(/student eligibility & campus email requirement/i)).toBeInTheDocument();
      expect(screen.getByText(/platform purpose & scope/i)).toBeInTheDocument();
    });

    it('renders PrivacyPage with DRAFT notice and privacy principles', () => {
      render(
        <MemoryRouter>
          <PrivacyPage />
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { level: 1, name: /privacy policy/i })).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent(/draft notice/i);
      expect(screen.getByText(/our core privacy commitment/i)).toBeInTheDocument();
      expect(screen.getByText(/mutual consent contact protection/i)).toBeInTheDocument();
      expect(screen.getByText(/data retention & anonymization/i)).toBeInTheDocument();
    });
  });

  describe('ErrorBoundary Component', () => {
    it('catches rendering errors and displays friendly fallback UI with reload option', () => {
      const ProblemChild = () => {
        throw new Error('Test exploding component');
      };

      // Suppress console.error in test output for intentional throw
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <ErrorBoundary>
          <ProblemChild />
        </ErrorBoundary>
      );

      expect(screen.getByText(/something unexpected happened/i)).toBeInTheDocument();
      expect(screen.getByText(/test exploding component/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /return home/i })).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('NotFoundPage Component (Global 404)', () => {
    it('renders 404 message and navigation links', () => {
      render(
        <MemoryRouter>
          <NotFoundPage />
        </MemoryRouter>
      );

      expect(screen.getByText('404')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /return home/i })).toHaveAttribute('href', '/');
      expect(screen.getByRole('link', { name: /explore matches/i })).toHaveAttribute('href', '/matches');
    });
  });
});
