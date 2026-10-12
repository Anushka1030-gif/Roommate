import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VerifyEmailPage from '../pages/VerifyEmailPage.jsx';
import AuthContext from '../context/authContext.js';

describe('VerifyEmailPage Component', () => {
  const mockVerifyOtp = vi.fn();
  const mockResendOtp = vi.fn();

  const renderVerify = (contextOverrides = {}, initialEntries = ['/verify-email']) => {
    const defaultContext = {
      user: { email: 'student@college.edu', email_verified: false },
      isAuthenticated: true,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      verifyOtp: mockVerifyOtp,
      resendOtp: mockResendOtp,
      logout: vi.fn(),
      refreshUser: vi.fn(),
      ...contextOverrides,
    };

    return render(
      <AuthContext.Provider value={defaultContext}>
        <MemoryRouter initialEntries={initialEntries}>
          <VerifyEmailPage />
        </MemoryRouter>
      </AuthContext.Provider>
    );
  };

  it('renders OTP input fields and email target', () => {
    renderVerify();

    expect(screen.getByRole('heading', { name: /verify your email/i })).toBeInTheDocument();
    expect(screen.getByText('student@college.edu')).toBeInTheDocument();
    expect(screen.getAllByRole('textbox').length).toBeGreaterThanOrEqual(6);
  });

  it('allows pasting 6-digit OTP code and submits', async () => {
    mockVerifyOtp.mockResolvedValueOnce({
      message: 'Email verified successfully.',
      user: { id: 1, email_verified: true },
    });

    renderVerify();

    const firstInput = screen.getByLabelText('Digit 1');
    fireEvent.paste(firstInput, {
      clipboardData: {
        getData: () => '123456',
      },
    });

    const submitBtn = screen.getByRole('button', { name: /verify email & continue/i });
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockVerifyOtp).toHaveBeenCalledWith({
        email: 'student@college.edu',
        otp: '123456',
      });
    });
  });
});
