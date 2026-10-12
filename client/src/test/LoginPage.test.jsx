import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../pages/LoginPage.jsx';
import AuthContext from '../context/authContext.js';

describe('LoginPage Component', () => {
  const mockLogin = vi.fn();

  const renderLogin = (contextOverrides = {}, initialEntries = ['/login']) => {
    const defaultContext = {
      user: null,
      loading: false,
      login: mockLogin,
      register: vi.fn(),
      verifyOtp: vi.fn(),
      resendOtp: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      ...contextOverrides,
    };

    return render(
      <AuthContext.Provider value={defaultContext}>
        <MemoryRouter initialEntries={initialEntries}>
          <LoginPage />
        </MemoryRouter>
      </AuthContext.Provider>
    );
  };

  it('renders login form elements', () => {
    renderLogin();

    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/college email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('validates empty inputs on submit', async () => {
    renderLogin();

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('submits valid credentials and shows error on invalid credentials', async () => {
    mockLogin.mockRejectedValueOnce({
      response: {
        status: 401,
        data: {
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password.',
          },
        },
      },
    });

    renderLogin();

    fireEvent.change(screen.getByLabelText(/college email address/i), {
      target: { value: 'user@college.edu' },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), {
      target: { value: 'wrongpassword' },
    });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'user@college.edu',
        password: 'wrongpassword',
      });
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });
});
