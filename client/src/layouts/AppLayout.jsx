import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import Button from '../components/ui/Button.jsx';
import Badge from '../components/ui/Badge.jsx';

export default function AppLayout() {
  const { user, isAuthenticated, isVerified, isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      navigate('/login');
    } catch {
      // Ignore error and force redirect
      navigate('/login');
    } finally {
      setIsLoggingOut(false);
      setMobileMenuOpen(false);
    }
  };

  const navLinkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors duration-150 px-3 py-2 rounded-lg ${
      isActive
        ? 'text-teal-700 bg-teal-50 font-semibold'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
    }`;

  const mobileNavLinkClass = ({ isActive }) =>
    `block text-base font-medium px-3 py-2.5 rounded-xl transition ${
      isActive
        ? 'text-teal-700 bg-teal-50 font-semibold'
        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-teal-500 rounded-lg p-1"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-700 to-emerald-500 flex items-center justify-center text-white shadow-sm shadow-teal-500/20 group-hover:scale-105 transition-transform duration-200">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-teal-800 to-emerald-700 bg-clip-text text-transparent">
                RoomieMatch
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-medium text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                Student Housing
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main Navigation">
            {isAuthenticated && isVerified && (
              <>
                <NavLink to="/matches" className={navLinkClass}>
                  Matches
                </NavLink>
                <NavLink to="/chats" className={navLinkClass}>
                  Chats
                </NavLink>
                <NavLink to="/settings" className={navLinkClass}>
                  Settings
                </NavLink>
                {isAdmin && (
                  <NavLink to="/admin" className={navLinkClass}>
                    <span className="inline-flex items-center gap-1.5">
                      <span>Admin</span>
                      <Badge variant="warning" size="sm">
                        Staff
                      </Badge>
                    </span>
                  </NavLink>
                )}
              </>
            )}

            {isAuthenticated && !isVerified && (
              <NavLink to="/verify-email" className={navLinkClass}>
                <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Verify Email
                </span>
              </NavLink>
            )}
          </nav>

          {/* Desktop Auth State / Actions */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-800 truncate max-w-[160px]">
                    {user?.full_name || user?.email}
                  </p>
                  <p className="text-xs text-slate-500 truncate max-w-[160px]">{user?.email}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  isLoading={isLoggingOut}
                >
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Log in
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm">
                    Create account
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200/80 bg-white px-4 pt-3 pb-6 space-y-3">
            {isAuthenticated && (
              <div className="p-3 bg-slate-50 rounded-xl mb-2 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {user?.full_name || 'Student User'}
                  </p>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                </div>
                {user?.role === 'admin' ? (
                  <Badge variant="warning" size="sm">
                    Admin
                  </Badge>
                ) : user?.email_verified ? (
                  <Badge variant="success" size="sm">
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="warning" size="sm">
                    Unverified
                  </Badge>
                )}
              </div>
            )}

            <div className="space-y-1">
              {isAuthenticated && isVerified && (
                <>
                  <NavLink
                    to="/matches"
                    onClick={() => setMobileMenuOpen(false)}
                    className={mobileNavLinkClass}
                  >
                    Matches
                  </NavLink>
                  <NavLink
                    to="/chats"
                    onClick={() => setMobileMenuOpen(false)}
                    className={mobileNavLinkClass}
                  >
                    Chats
                  </NavLink>
                  <NavLink
                    to="/settings"
                    onClick={() => setMobileMenuOpen(false)}
                    className={mobileNavLinkClass}
                  >
                    Settings
                  </NavLink>
                  {isAdmin && (
                    <NavLink
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className={mobileNavLinkClass}
                    >
                      Admin Dashboard
                    </NavLink>
                  )}
                </>
              )}

              {isAuthenticated && !isVerified && (
                <NavLink
                  to="/verify-email"
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileNavLinkClass}
                >
                  Verify Email
                </NavLink>
              )}

              {!isAuthenticated && (
                <>
                  <NavLink
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className={mobileNavLinkClass}
                  >
                    Log In
                  </NavLink>
                  <NavLink
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className={mobileNavLinkClass}
                  >
                    Create Account
                  </NavLink>
                </>
              )}
            </div>

            {isAuthenticated && (
              <div className="pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  fullWidth
                  onClick={handleLogout}
                  isLoading={isLoggingOut}
                >
                  Logout
                </Button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200/80 bg-white py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p className="font-medium text-slate-600">
            RoomieMatch — Smart Student Roommate Matching Platform
          </p>
          <p>
            Exclusively for university & college students. Campus verified. Bhopal community launch.
          </p>
          <p className="text-slate-400 pt-2">
            &copy; {new Date().getFullYear()} RoomieMatch. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
