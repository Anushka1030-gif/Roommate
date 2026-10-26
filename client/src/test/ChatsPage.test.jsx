import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ChatsPage from '../pages/ChatsPage.jsx';
import AuthContext from '../context/authContext.js';
import ToastContext from '../context/toastContext.js';
import api from '../services/api.js';

const mockSocket = {
  connected: true,
  connect: vi.fn(),
  disconnect: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
};

vi.mock('../services/socket.js', () => ({
  getSocket: () => mockSocket,
  connectSocket: () => mockSocket,
  disconnectSocket: vi.fn(),
  default: {
    getSocket: () => mockSocket,
    connectSocket: () => mockSocket,
    disconnectSocket: vi.fn(),
  },
}));

vi.mock('../services/api.js', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('ChatsPage Component', () => {
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
  };

  const sampleConversations = [
    {
      id: 10,
      user_a_id: 1,
      user_b_id: 2,
      other_user: {
        id: 2,
        full_name: 'Rohan Verma',
        college_name: 'MANIT Bhopal',
        major: 'Computer Science',
        city: 'Bhopal',
        age: 21,
        gender: 'male',
      },
      last_message: {
        id: 101,
        sender_id: 2,
        content: 'Hey Aarav! Have you looked at flats near Indrapuri?',
        is_read: false,
        created_at: new Date().toISOString(),
      },
      unread_count: 2,
      last_message_at: new Date().toISOString(),
      is_blocked: false,
    },
    {
      id: 20,
      user_a_id: 1,
      user_b_id: 3,
      other_user: {
        id: 3,
        full_name: 'Priya Patel',
        college_name: 'AIIMS Bhopal',
        major: 'Medicine',
        city: 'Bhopal',
        age: 22,
        gender: 'female',
      },
      last_message: {
        id: 102,
        sender_id: 1,
        content: 'Sounds good, let us compare our study schedules.',
        is_read: true,
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
      unread_count: 0,
      last_message_at: new Date(Date.now() - 3600000).toISOString(),
      is_blocked: false,
    },
  ];

  const sampleMessagesConv10 = {
    conversation: sampleConversations[0],
    messages: [
      {
        id: 100,
        conversation_id: 10,
        sender_id: 1,
        content: 'Hi Rohan! Nice to connect with you.',
        is_read: true,
        created_at: new Date(Date.now() - 10000).toISOString(),
      },
      {
        id: 101,
        conversation_id: 10,
        sender_id: 2,
        content: 'Hey Aarav! Have you looked at flats near Indrapuri?',
        is_read: false,
        created_at: new Date().toISOString(),
      },
    ],
    is_blocked: false,
    has_more: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default API mocks
    api.get.mockImplementation((url) => {
      if (url === '/conversations') {
        return Promise.resolve({
          data: {
            conversations: sampleConversations,
            count: sampleConversations.length,
          },
        });
      }
      if (url === '/conversations/10/messages') {
        return Promise.resolve({
          data: sampleMessagesConv10,
        });
      }
      return Promise.reject(new Error(`Unhandled GET url: ${url}`));
    });

    api.post.mockImplementation((url, body) => {
      if (url === '/conversations/10/read') {
        return Promise.resolve({
          data: { success: true, updated_count: 1 },
        });
      }
      if (url === '/conversations/10/messages') {
        return Promise.resolve({
          data: {
            success: true,
            message: {
              id: 103,
              conversation_id: 10,
              sender_id: 1,
              content: body.content,
              is_read: false,
              created_at: new Date().toISOString(),
            },
          },
        });
      }
      if (url === '/conversations') {
        return Promise.resolve({
          data: {
            success: true,
            conversation: sampleConversations[0],
          },
        });
      }
      return Promise.reject(new Error(`Unhandled POST url: ${url}`));
    });
  });

  const renderChatsPage = (initialRoute = '/chats') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <AuthContext.Provider value={{ user: defaultUser, isAuthenticated: true }}>
          <ToastContext.Provider value={mockToast}>
            <Routes>
              <Route path="/chats" element={<ChatsPage />} />
            </Routes>
          </ToastContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>
    );
  };

  it('renders conversations sidebar with names, college snippets, and unread counts', async () => {
    renderChatsPage();

    await waitFor(() => {
      expect(screen.getByText('Rohan Verma')).toBeInTheDocument();
      expect(screen.getByText('Priya Patel')).toBeInTheDocument();
    });

    // Unread count badge for Rohan and total unread
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);

    // Last message preview
    expect(
      screen.getByText('Hey Aarav! Have you looked at flats near Indrapuri?')
    ).toBeInTheDocument();
  });

  it('filters conversations when typing into search input', async () => {
    renderChatsPage();

    await waitFor(() => {
      expect(screen.getByText('Rohan Verma')).toBeInTheDocument();
      expect(screen.getByText('Priya Patel')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search conversations/i);
    fireEvent.change(searchInput, { target: { value: 'Priya' } });

    expect(screen.queryByText('Rohan Verma')).not.toBeInTheDocument();
    expect(screen.getByText('Priya Patel')).toBeInTheDocument();

    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } });
    expect(screen.getByText('Rohan Verma')).toBeInTheDocument();
  });

  it('selects a conversation and loads message stream history', async () => {
    renderChatsPage();

    await waitFor(() => {
      expect(screen.getByText('Rohan Verma')).toBeInTheDocument();
    });

    // Click on Rohan Verma's conversation
    fireEvent.click(screen.getByText('Rohan Verma'));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/conversations/10/messages', expect.any(Object));
    });

    // Messages should appear in chat window
    await waitFor(() => {
      expect(screen.getByText('Hi Rohan! Nice to connect with you.')).toBeInTheDocument();
      expect(
        screen.getAllByText('Hey Aarav! Have you looked at flats near Indrapuri?').length
      ).toBeGreaterThanOrEqual(1);
    });

    // Chat header should display partner name
    expect(screen.getAllByText('Rohan Verma').length).toBeGreaterThanOrEqual(1);
  });

  it('sends a chat message and updates stream', async () => {
    renderChatsPage();

    await waitFor(() => {
      expect(screen.getByText('Rohan Verma')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Rohan Verma'));

    await waitFor(() => {
      expect(screen.getByText('Hi Rohan! Nice to connect with you.')).toBeInTheDocument();
    });

    // Type a message in the composer
    const textarea = screen.getByPlaceholderText(/type a message/i);
    fireEvent.change(textarea, {
      target: { value: 'Yes, Indrapuri is great for commuting!' },
    });

    const sendBtn = screen.getByRole('button', { name: /send message/i });
    expect(sendBtn).not.toBeDisabled();

    // Submit message
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'send_message',
        {
          conversation_id: 10,
          content: 'Yes, Indrapuri is great for commuting!',
        },
        expect.any(Function)
      );
    });
  });

  it('inserts AI icebreaker suggestion into composer on click', async () => {
    renderChatsPage();

    await waitFor(() => {
      expect(screen.getByText('Rohan Verma')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Rohan Verma'));

    await waitFor(() => {
      expect(screen.getByText('Suggested Icebreakers')).toBeInTheDocument();
    });

    const icebreakerBtn = screen.getByText(
      /Have you started looking at flats or PGs around college yet/i
    );
    fireEvent.click(icebreakerBtn);

    const textarea = screen.getByPlaceholderText(/type a message/i);
    expect(textarea.value).toContain('Have you started looking at flats or PGs');
  });

  it('handles ?candidateId= query param to start conversation with candidate', async () => {
    renderChatsPage('/chats?candidateId=2&name=Rohan');

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/conversations', { candidate_user_id: 2 });
    });
  });

  it('displays blocked alert banner when conversation is blocked', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/conversations') {
        return Promise.resolve({
          data: {
            conversations: [
              {
                ...sampleConversations[0],
                is_blocked: true,
              },
            ],
            count: 1,
          },
        });
      }
      if (url === '/conversations/10/messages') {
        return Promise.resolve({
          data: {
            ...sampleMessagesConv10,
            is_blocked: true,
          },
        });
      }
      return Promise.reject(new Error(`Unhandled GET url: ${url}`));
    });

    renderChatsPage();

    await waitFor(() => {
      expect(screen.getByText('Rohan Verma')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Rohan Verma'));

    await waitFor(() => {
      expect(
        screen.getByText(/this conversation is disabled because a user has been blocked/i)
      ).toBeInTheDocument();
    });

    // Composer textarea should not be rendered
    expect(screen.queryByPlaceholderText(/type a message/i)).not.toBeInTheDocument();
  });

  it('displays empty state when no conversations exist', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/conversations') {
        return Promise.resolve({
          data: { conversations: [], count: 0 },
        });
      }
      return Promise.reject(new Error(`Unhandled GET: ${url}`));
    });

    renderChatsPage();

    await waitFor(() => {
      expect(screen.getByText(/no conversations yet/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/connect with compatible roommates/i)).toBeInTheDocument();
  });
});
