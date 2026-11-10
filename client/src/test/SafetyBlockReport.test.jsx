import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import SafetyActionMenu from '../components/safety/SafetyActionMenu.jsx';
import BlockConfirmModal from '../components/safety/BlockConfirmModal.jsx';
import ReportModal from '../components/safety/ReportModal.jsx';
import MatchCard from '../components/matches/MatchCard.jsx';
import SettingsPage from '../pages/SettingsPage.jsx';
import ChatsPage from '../pages/ChatsPage.jsx';
import api from '../services/api.js';

// Mock dependencies
vi.mock('../services/api.js', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../hooks/useAuth.js', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      full_name: 'Test Student',
      email: 'test@manit.ac.in',
      role: 'student',
      status: 'active',
      email_verified: true,
      profile_completed: true,
    },
  }),
}));

const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  showToast: vi.fn(),
};

vi.mock('../hooks/useToast.js', () => ({
  useToast: () => ({
    toast: mockToast,
    showToast: mockToast.showToast,
  }),
}));

let mockChatState = {
  conversations: [
    {
      id: 5,
      other_user: { id: 88, full_name: 'Blocked Student', college_name: 'MANIT' },
      last_message: { content: 'Past message' },
      unread_count: 0,
    },
  ],
  activeConversationId: 5,
  activeConversation: {
    id: 5,
    other_user: { id: 88, full_name: 'Blocked Student', college_name: 'MANIT' },
    is_blocked: true,
  },
  messages: [{ id: 1, sender_id: 88, content: 'Past message before block' }],
  hasMoreMessages: false,
  isBlocked: true,
  setIsBlocked: vi.fn(),
  partnerTyping: false,
  loadingConversations: false,
  loadingMessages: false,
  loadingMoreMessages: false,
  sendingMessage: false,
  socketConnected: true,
  error: null,
  selectConversation: vi.fn(),
  startConversationWithCandidate: vi.fn(),
  sendChatMessage: vi.fn(),
  loadOlderMessages: vi.fn(),
  emitTyping: vi.fn(),
  clearError: vi.fn(),
  contactDetails: null,
  loadingContact: false,
  togglingShare: false,
  confirmingRoommates: false,
  toggleShareContact: vi.fn(),
  confirmRoommates: vi.fn(),
};

vi.mock('../hooks/useChat.js', () => ({
  useChat: () => mockChatState,
}));

describe('Safety: Block and Report UI Components (Step 13)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SafetyActionMenu Component', () => {
    it('renders "..." menu button and toggles dropdown on click', () => {
      const onBlock = vi.fn();
      const onReport = vi.fn();

      render(
        <SafetyActionMenu
          userName="Jane Doe"
          onBlock={onBlock}
          onReport={onReport}
        />
      );

      const menuBtn = screen.getByRole('button', { name: /Safety options for Jane Doe/i });
      expect(menuBtn).toBeInTheDocument();
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();

      // Click to open dropdown
      fireEvent.click(menuBtn);
      expect(screen.getByRole('menu')).toBeInTheDocument();

      const blockBtn = screen.getByRole('menuitem', { name: /Block User/i });
      const reportBtn = screen.getByRole('menuitem', { name: /Report User/i });
      expect(blockBtn).toBeInTheDocument();
      expect(reportBtn).toBeInTheDocument();

      // Click Block
      fireEvent.click(blockBtn);
      expect(onBlock).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  describe('BlockConfirmModal Component', () => {
    it('renders confirmation dialog with user details and triggers onConfirm', () => {
      const onConfirm = vi.fn();
      const onClose = vi.fn();

      render(
        <BlockConfirmModal
          isOpen={true}
          userName="Rohan Verma"
          onConfirm={onConfirm}
          onClose={onClose}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Block Rohan Verma\?/i })).toBeInTheDocument();
      expect(screen.getByText(/Both of you will disappear from each other's roommate matches immediately/i)).toBeInTheDocument();

      const blockSubmitBtn = screen.getByRole('button', { name: /Block User/i });
      fireEvent.click(blockSubmitBtn);
      expect(onConfirm).toHaveBeenCalledTimes(1);

      const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelBtn);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('ReportModal Component', () => {
    it('renders reason options, character limit counter, and submits valid report', async () => {
      const onSubmit = vi.fn().mockResolvedValue({});
      const onClose = vi.fn();

      render(
        <ReportModal
          isOpen={true}
          userName="Spam Candidate"
          onSubmit={onSubmit}
          onClose={onClose}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/Report Spam Candidate/i)).toBeInTheDocument();

      // Check PRD reason enum options in select
      const select = screen.getByLabelText(/Reason for reporting/i);
      expect(select).toBeInTheDocument();

      // Change reason to fake_profile
      fireEvent.change(select, { target: { value: 'fake_profile' } });

      // Enter details
      const textarea = screen.getByLabelText(/Additional details/i);
      fireEvent.change(textarea, { target: { value: 'Profile photos look fraudulent and information is fake.' } });

      // Check character limit count hint
      expect(screen.getByText(/\/500 characters/i)).toBeInTheDocument();

      // Submit form
      const submitBtn = screen.getByRole('button', { name: /Submit Report/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          reason: 'fake_profile',
          details: 'Profile photos look fraudulent and information is fake.',
        });
      });
    });
  });

  describe('MatchCard Integration with Safety Menu', () => {
    const mockMatch = {
      id: 101,
      candidate_id: 202,
      compatibility_score: 91,
      user: {
        id: 202,
        full_name: 'Ananya Roy',
        age: 22,
        gender: 'female',
        college_name: 'MANIT Bhopal',
        city: 'Bhopal',
      },
      highlights: ['Early bird schedule', 'Tidy habits'],
      explanation: 'Great match based on aligned study habits.',
    };

    it('renders "..." safety menu on match card and triggers onBlock and onReport callbacks', () => {
      const onBlock = vi.fn();
      const onReport = vi.fn();

      render(
        <MatchCard
          match={mockMatch}
          rank={1}
          onBlock={onBlock}
          onReport={onReport}
        />
      );

      const menuBtn = screen.getByRole('button', { name: /Safety options for Ananya Roy/i });
      expect(menuBtn).toBeInTheDocument();

      fireEvent.click(menuBtn);

      const blockOption = screen.getByRole('menuitem', { name: /Block User/i });
      fireEvent.click(blockOption);
      expect(onBlock).toHaveBeenCalledWith(mockMatch);

      fireEvent.click(menuBtn);
      const reportOption = screen.getByRole('menuitem', { name: /Report User/i });
      fireEvent.click(reportOption);
      expect(onReport).toHaveBeenCalledWith(mockMatch);
    });
  });

  describe('SettingsPage: Blocked Users Section', () => {
    it('renders blocked users list and allows unblocking a user', async () => {
      // Mock profile response
      api.get.mockImplementation((url) => {
        if (url === '/profile/me') {
          return Promise.resolve({
            data: {
              profile: {
                full_name: 'Test Student',
                college_name: 'MANIT Bhopal',
                city: 'Bhopal',
              },
              profile_complete: true,
              completeness_percentage: 100,
            },
          });
        }
        if (url === '/api/blocks') {
          return Promise.resolve({
            data: {
              success: true,
              blocks: [
                {
                  block_id: 1,
                  blocked_user_id: 77,
                  display_name: 'Rohan Sharma',
                  created_at: new Date().toISOString(),
                },
              ],
            },
          });
        }
        return Promise.reject(new Error('Unknown url'));
      });

      api.delete.mockResolvedValue({
        data: { success: true, message: 'User unblocked successfully' },
      });

      render(
        <MemoryRouter>
          <SettingsPage />
        </MemoryRouter>
      );

      // Verify "Blocked Users" section appears
      expect(await screen.findByText('Blocked Users')).toBeInTheDocument();
      expect(await screen.findByText('Rohan Sharma')).toBeInTheDocument();

      // Find and click unblock button
      const unblockBtn = screen.getByRole('button', { name: /Unblock/i });
      expect(unblockBtn).toBeInTheDocument();

      fireEvent.click(unblockBtn);

      expect(api.delete).toHaveBeenCalledWith('/api/blocks/77');
      await waitFor(() => {
        expect(screen.queryByText('Rohan Sharma')).not.toBeInTheDocument();
        expect(screen.getByText(/You haven't blocked any users/i)).toBeInTheDocument();
      });
    });

    it('renders friendly empty state when no users are blocked', async () => {
      api.get.mockImplementation((url) => {
        if (url === '/profile/me') {
          return Promise.resolve({
            data: { profile: {}, profile_complete: true },
          });
        }
        if (url === '/api/blocks') {
          return Promise.resolve({
            data: { success: true, blocks: [] },
          });
        }
        return Promise.resolve({ data: {} });
      });

      render(
        <MemoryRouter>
          <SettingsPage />
        </MemoryRouter>
      );

      expect(await screen.findByText(/You haven't blocked any users/i)).toBeInTheDocument();
    });
  });

  describe('ChatsPage: Blocked Conversation Banner and Composer Disabling', () => {
    it('shows clear banner and disables composer when conversation is blocked', () => {
      render(
        <MemoryRouter>
          <ChatsPage />
        </MemoryRouter>
      );

      // Verify clear banner
      expect(
        screen.getByText(/This conversation is read-only because one of the users has been blocked/i)
      ).toBeInTheDocument();

      // Verify composer is disabled / displays blocked message
      expect(
        screen.getByText(/This conversation is disabled because a user has been blocked/i)
      ).toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/Type a message/i)).not.toBeInTheDocument();
    });
  });
});
