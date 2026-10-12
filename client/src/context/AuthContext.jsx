import { useState, useEffect, useCallback, useMemo } from 'react';
import { AuthContext } from './authContext.js';
import api, { setAuthUnauthorizedHandler } from '../services/api.js';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.data?.user) {
        setUser(response.data.user);
        return response.data.user;
      }
      setUser(null);
      return null;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data?.user) {
      setUser(response.data.user);
    }
    return response.data;
  }, []);

  const register = useCallback(async ({ full_name, email, password }) => {
    const response = await api.post('/auth/register', { full_name, email, password });
    return response.data;
  }, []);

  const verifyOtp = useCallback(async ({ email, otp }) => {
    const response = await api.post('/auth/verify-otp', { email, otp });
    if (response.data?.user) {
      setUser((prev) => (prev ? { ...prev, ...response.data.user } : response.data.user));
    } else {
      setUser((prev) => (prev ? { ...prev, email_verified: true } : null));
    }
    return response.data;
  }, []);

  const resendOtp = useCallback(async ({ email }) => {
    const response = await api.post('/auth/resend-otp', { email });
    return response.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    setAuthUnauthorizedHandler(() => {
      setUser(null);
    });

    let isMounted = true;

    async function checkAuth() {
      try {
        const response = await api.get('/auth/me');
        if (isMounted) {
          setUser(response.data?.user || null);
        }
      } catch {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      isVerified: Boolean(user?.email_verified),
      isAdmin: user?.role === 'admin',
      login,
      register,
      verifyOtp,
      resendOtp,
      logout,
      refreshUser,
      setUser,
    }),
    [user, loading, login, register, verifyOtp, resendOtp, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
