import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import AppLayout from './layouts/AppLayout.jsx';

import HomePage from './pages/HomePage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import VerifyEmailPage from './pages/VerifyEmailPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ProfileOnboardingPage from './pages/ProfileOnboardingPage.jsx';
import RequirementPage from './pages/RequirementPage.jsx';
import MatchesPage from './pages/MatchesPage.jsx';
import ChatsPage from './pages/ChatsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

import ProtectedRoute from './components/guards/ProtectedRoute.jsx';
import VerifiedRoute from './components/guards/VerifiedRoute.jsx';
import CompleteProfileRoute from './components/guards/CompleteProfileRoute.jsx';
import AdminRoute from './components/guards/AdminRoute.jsx';
import GuestRoute from './components/guards/GuestRoute.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
          <Route element={<AppLayout />}>
            {/* Public routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />

            {/* Guest only routes (redirect if already logged in) */}
            <Route
              path="/register"
              element={
                <GuestRoute>
                  <RegisterPage />
                </GuestRoute>
              }
            />
            <Route
              path="/login"
              element={
                <GuestRoute>
                  <LoginPage />
                </GuestRoute>
              }
            />

            {/* Verified student protected routes */}
            <Route
              path="/onboarding/profile"
              element={
                <VerifiedRoute>
                  <ProfileOnboardingPage />
                </VerifiedRoute>
              }
            />
            <Route
              path="/requirement"
              element={
                <CompleteProfileRoute>
                  <RequirementPage />
                </CompleteProfileRoute>
              }
            />
            <Route
              path="/matches"
              element={
                <VerifiedRoute>
                  <MatchesPage />
                </VerifiedRoute>
              }
            />
            <Route
              path="/chats"
              element={
                <VerifiedRoute>
                  <ChatsPage />
                </VerifiedRoute>
              }
            />

            {/* Protected user routes */}
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />

            {/* Admin only routes */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminPage />
                </AdminRoute>
              }
            />

            {/* Fallback 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
