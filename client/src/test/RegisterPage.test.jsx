import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RegisterPage from '../pages/RegisterPage.jsx';
import AuthContext from '../context/authContext.js';

describe('RegisterPage Component', () => {
  const mockRegister = vi.fn();

  const renderRegister = (contextOverrides = {}) => {
    const defaultContext = {
      user: null,
      loading: false,
      register: mockRegister,
      login: vi.fn(),
      verifyOtp: vi.fn(),
      resendOtp: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      ...contextOverrides,
    };

    return render(
      <AuthContext.Provider value={defaultContext}>
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      </AuthContext.Provider>
    );
  };

  it('renders registration form elements', () => {
    renderRegister();

    expect(screen.getByRole('heading', { name: /create student account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/college email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account & send otp/i })).toBeInTheDocument();
  });

  it('displays client-side validation errors when submitting empty form', async () => {
    renderRegister();

    const submitBtn = screen.getByRole('button', { name: /create account & send otp/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/full name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/college email address is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    expect(screen.getByText(/you must agree to the terms of service/i)).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('validates minimum password length', async () => {
    renderRegister();

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Aarav Sharma' } });
    fireEvent.change(screen.getByLabelText(/college email address/i), {
      target: { value: 'aarav@college.ac.in' },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('checkbox'));

    fireEvent.click(screen.getByRole('button', { name: /create account & send otp/i }));

    expect(await screen.findByText(/password must be at least 8 characters long/i)).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('displays friendly warning when blocked email domain error is returned by server', async () => {
    mockRegister.mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          error: {
            code: 'EMAIL_DOMAIN_NOT_ALLOWED',
            message: 'Public email providers (gmail.com) are not allowed. Please register with your official college or university email address.',
          },
        },
      },
    });

    renderRegister();

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Aarav Sharma' } });
    fireEvent.change(screen.getByLabelText(/college email address/i), {
      target: { value: 'aarav@gmail.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('checkbox'));

    fireEvent.click(screen.getByRole('button', { name: /create account & send otp/i }));

    await waitFor(() => {
      expect(screen.getByText(/official college email required/i)).toBeInTheDocument();
      expect(
        screen.getByText(/public email providers like gmail, yahoo, or outlook are not permitted/i)
      ).toBeInTheDocument();
    });
  });
});
