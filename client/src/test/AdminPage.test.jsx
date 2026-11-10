import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminPage from '../pages/AdminPage.jsx';
import api from '../services/api.js';

// Mock API
vi.mock('../services/api.js', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock Toast
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  showToast: vi.fn(),
};

vi.mock('../hooks/useToast.js', () => ({
  useToast: () => ({
    toast: mockToast,
    showToast: mockToast.showToast,
  }),
}));

describe('Admin Dashboard Frontend Component Tests (Step 14)', () => {
  const mockStats = {
    total_users: 150,
    verified_users: 120,
    completed_profiles: 95,
    active_requirements: 78,
    conversations: 45,
    contact_share_agreements: 18,
    confirmed_roommate_pairs: 12,
  };

  const mockReports = [
    {
      id: 101,
      reporter: {
        id: 1,
        name: 'Aarav Sharma',
        email: 'aarav@manit.ac.in',
      },
      reported_user: {
        id: 2,
        name: 'Bad Actor',
        email: 'badactor@manit.ac.in',
        status: 'active',
        total_reports_count: 3,
      },
      reason: 'harassment',
      details: 'Sent threatening messages in chat after being declined.',
      status: 'pending',
      admin_note: null,
      created_at: new Date().toISOString(),
    },
    {
      id: 102,
      reporter: {
        id: 3,
        name: 'Priya Verma',
        email: 'priya@manit.ac.in',
      },
      reported_user: {
        id: 4,
        name: 'Suspicious Account',
        email: 'fake@manit.ac.in',
        status: 'active',
        total_reports_count: 1,
      },
      reason: 'fake_profile',
      details: 'Claims to be student but asks for cash upfront.',
      status: 'pending',
      admin_note: null,
      created_at: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    api.get.mockImplementation((url) => {
      if (url.includes('/admin/stats')) {
        return Promise.resolve({ data: { stats: mockStats } });
      }
      if (url.includes('/admin/reports')) {
        return Promise.resolve({ data: { reports: mockReports } });
      }
      return Promise.resolve({ data: {} });
    });

    api.patch.mockResolvedValue({
      data: { success: true, message: 'Action executed successfully.' },
    });
  });

  it('renders platform stats cards with Confirmed Roommate Pairs visually emphasized as north-star metric', async () => {
    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('north-star-card')).toBeInTheDocument();
    });

    // Check North-Star Metric
    expect(screen.getByText(/Confirmed Roommate Pairs/i)).toBeInTheDocument();
    expect(screen.getByTestId('confirmed-roommate-pairs-count')).toHaveTextContent('12');
    expect(screen.getByText(/North-Star Metric/i)).toBeInTheDocument();

    // Check supporting stats
    expect(screen.getByTestId('stat-total-users')).toHaveTextContent('150');
    expect(screen.getByTestId('stat-verified-users')).toHaveTextContent('120');
    expect(screen.getByTestId('stat-completed-profiles')).toHaveTextContent('95');
    expect(screen.getByTestId('stat-active-requirements')).toHaveTextContent('78');
    expect(screen.getByTestId('stat-conversations')).toHaveTextContent('45');
    expect(screen.getByTestId('stat-contact-agreements')).toHaveTextContent('18');
  });

  it('renders reports list with reporter and reported user names, emails, total reports, and details', async () => {
    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Aarav Sharma/i)).toBeInTheDocument();
    });

    // Verify reporter details
    expect(screen.getByText('aarav@manit.ac.in')).toBeInTheDocument();

    // Verify reported user details and email (admins are authorized to see emails)
    expect(screen.getByText(/Bad Actor/i)).toBeInTheDocument();
    expect(screen.getByText('badactor@manit.ac.in')).toBeInTheDocument();

    // Verify total reports count badge
    expect(screen.getByText('3 reports total')).toBeInTheDocument();

    // Verify reason and incident description
    expect(screen.getByText('Harassment & Abuse')).toBeInTheDocument();
    expect(screen.getByText(/Sent threatening messages in chat/i)).toBeInTheDocument();
  });

  it('allows dismissing a report with an optional admin note', async () => {
    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('report-item-101')).toBeInTheDocument();
    });

    const reportCard = screen.getByTestId('report-item-101');
    const dismissBtn = reportCard.querySelector('button:nth-child(1)');
    expect(dismissBtn).toHaveTextContent('Dismiss');
    fireEvent.click(dismissBtn);

    // Modal opens
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Dismiss Report/i })).toBeInTheDocument();
    });

    // Add note
    const noteInput = screen.getByPlaceholderText(/Add any notes on why this report was dismissed/i);
    fireEvent.change(noteInput, { target: { value: 'Investigated and found no rule violation.' } });

    // Submit dismissal
    const submitBtn = screen.getByRole('button', { name: 'Dismiss Report' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/admin/reports/101', {
        action: 'dismiss',
        note: 'Investigated and found no rule violation.',
      });
      expect(mockToast.showToast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success', message: 'Report dismissed.' })
      );
    });
  });

  it('allows issuing a warning to a reported user with an admin note', async () => {
    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('report-item-101')).toBeInTheDocument();
    });

    const reportCard = screen.getByTestId('report-item-101');
    const warnBtn = reportCard.querySelector('button:nth-child(2)');
    expect(warnBtn).toHaveTextContent('Warn');
    fireEvent.click(warnBtn);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/Issue Community Warning/i)).toBeInTheDocument();
    });

    const noteInput = screen.getByPlaceholderText(/Specify what community guideline was violated/i);
    fireEvent.change(noteInput, { target: { value: 'First warning: please keep chat respectful.' } });

    const submitBtn = screen.getByRole('button', { name: 'Send Warning' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/admin/reports/101', {
        action: 'warn',
        note: 'First warning: please keep chat respectful.',
      });
      expect(mockToast.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          message: expect.stringContaining('Warning sent to Bad Actor'),
        })
      );
    });
  });

  it('requires explicit confirmation before suspending a user account', async () => {
    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('report-item-101')).toBeInTheDocument();
    });

    const reportCard = screen.getByTestId('report-item-101');
    const suspendBtn = reportCard.querySelector('button:nth-child(3)');
    expect(suspendBtn).toHaveTextContent('Suspend');
    fireEvent.click(suspendBtn);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/Suspend User Account/i)).toBeInTheDocument();
    });

    const confirmBtn = screen.getByRole('button', { name: 'Confirm & Suspend User' });
    // Button is disabled until confirmation checkbox is checked
    expect(confirmBtn).toBeDisabled();

    // Check the confirmation checkbox
    const checkbox = screen.getByTestId('suspend-confirm-checkbox');
    fireEvent.click(checkbox);
    expect(confirmBtn).not.toBeDisabled();

    // Add suspension reason
    const noteInput = screen.getByPlaceholderText(/Explain the severe violation/i);
    fireEvent.change(noteInput, { target: { value: 'Severe harassment of multiple students.' } });

    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/admin/reports/101', {
        action: 'suspend',
        note: 'Severe harassment of multiple students.',
      });
      expect(mockToast.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          message: expect.stringContaining('Bad Actor has been suspended'),
        })
      );
    });
  });

  it('renders empty state when there are no open reports', async () => {
    api.get.mockImplementation((url) => {
      if (url.includes('/admin/stats')) {
        return Promise.resolve({ data: { stats: mockStats } });
      }
      if (url.includes('/admin/reports')) {
        return Promise.resolve({ data: { reports: [] } });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('reports-empty-state')).toBeInTheDocument();
      expect(screen.getByText('No open reports')).toBeInTheDocument();
    });
  });

  it('switches status filter tabs and fetches corresponding reports', async () => {
    render(
      <MemoryRouter>
        <AdminPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Dismissed' })).toBeInTheDocument();
    });

    const dismissedTab = screen.getByRole('tab', { name: 'Dismissed' });
    fireEvent.click(dismissedTab);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/admin/reports?status=dismissed');
    });
  });
});
