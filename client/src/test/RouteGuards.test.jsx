import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AuthContext from '../context/authContext.js';
import ProtectedRoute from '../components/guards/ProtectedRoute.jsx';
import VerifiedRoute from '../components/guards/VerifiedRoute.jsx';
import CompleteProfileRoute from '../components/guards/CompleteProfileRoute.jsx';
import AdminRoute from '../components/guards/AdminRoute.jsx';

describe('Route Guards', () => {
  const renderWithAuth = (user, initialRoute = '/protected') => {
    const authValue = {
      user,
      loading: false,
      isAuthenticated: Boolean(user),
      isVerified: Boolean(user?.email_verified),
      isAdmin: user?.role === 'admin',
    };

    return render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route path="/login" element={<div>Login Page Target</div>} />
            <Route path="/verify-email" element={<div>Verify Email Target</div>} />
            <Route path="/onboarding/profile" element={<div>Profile Onboarding Target</div>} />
            <Route path="/matches" element={<div>Matches Fallback Target</div>} />

            <Route
              path="/protected"
              element={
                <ProtectedRoute>
                  <div>Secret Protected Content</div>
                </ProtectedRoute>
              }
            />

            <Route
              path="/verified-only"
              element={
                <VerifiedRoute>
                  <div>Verified Only Content</div>
                </VerifiedRoute>
              }
            />

            <Route
              path="/complete-profile-only"
              element={
                <CompleteProfileRoute>
                  <div>Complete Profile Content</div>
                </CompleteProfileRoute>
              }
            />

            <Route
              path="/admin-only"
              element={
                <AdminRoute>
                  <div>Admin Panel Content</div>
                </AdminRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );
  };

  it('ProtectedRoute redirects unauthenticated visitors to /login', () => {
    renderWithAuth(null, '/protected');
    expect(screen.getByText('Login Page Target')).toBeInTheDocument();
    expect(screen.queryByText('Secret Protected Content')).not.toBeInTheDocument();
  });

  it('ProtectedRoute allows authenticated users', () => {
    renderWithAuth({ id: 1, email: 'user@edu.in' }, '/protected');
    expect(screen.getByText('Secret Protected Content')).toBeInTheDocument();
  });

  it('VerifiedRoute redirects unverified users to /verify-email', () => {
    renderWithAuth({ id: 1, email: 'user@edu.in', email_verified: false }, '/verified-only');
    expect(screen.getByText('Verify Email Target')).toBeInTheDocument();
    expect(screen.queryByText('Verified Only Content')).not.toBeInTheDocument();
  });

  it('VerifiedRoute allows verified users', () => {
    renderWithAuth({ id: 1, email: 'user@edu.in', email_verified: true }, '/verified-only');
    expect(screen.getByText('Verified Only Content')).toBeInTheDocument();
  });

  it('AdminRoute redirects non-admin users to /matches', () => {
    renderWithAuth({ id: 1, email: 'user@edu.in', role: 'student' }, '/admin-only');
    expect(screen.getByText('Matches Fallback Target')).toBeInTheDocument();
    expect(screen.queryByText('Admin Panel Content')).not.toBeInTheDocument();
  });

  it('AdminRoute allows admin users', () => {
    renderWithAuth({ id: 1, email: 'admin@edu.in', role: 'admin' }, '/admin-only');
    expect(screen.getByText('Admin Panel Content')).toBeInTheDocument();
  });

  it('CompleteProfileRoute redirects unauthenticated visitors to /login', () => {
    renderWithAuth(null, '/complete-profile-only');
    expect(screen.getByText('Login Page Target')).toBeInTheDocument();
  });

  it('CompleteProfileRoute redirects unverified users to /verify-email', () => {
    renderWithAuth({ id: 1, email: 'user@edu.in', email_verified: false }, '/complete-profile-only');
    expect(screen.getByText('Verify Email Target')).toBeInTheDocument();
  });

  it('CompleteProfileRoute redirects users with incomplete profile to /onboarding/profile', () => {
    renderWithAuth(
      { id: 1, email: 'user@edu.in', email_verified: true, profile_completed: false },
      '/complete-profile-only'
    );
    expect(screen.getByText('Profile Onboarding Target')).toBeInTheDocument();
    expect(screen.queryByText('Complete Profile Content')).not.toBeInTheDocument();
  });

  it('CompleteProfileRoute allows users with a complete profile', () => {
    renderWithAuth(
      { id: 1, email: 'user@edu.in', email_verified: true, profile_completed: true },
      '/complete-profile-only'
    );
    expect(screen.getByText('Complete Profile Content')).toBeInTheDocument();
  });
});
