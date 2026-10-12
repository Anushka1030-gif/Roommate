import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let onUnauthorizedCallback = null;

/**
 * Register a callback to clear frontend auth state when a 401 occurs.
 */
export const setAuthUnauthorizedHandler = (callback) => {
  onUnauthorizedCallback = callback;
};

// Response interceptor to handle 401 responses globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Trigger callback if registered and request is not the initial /api/auth/me probe
      const url = error.config?.url || '';
      const isMeProbe = url.includes('/auth/me');

      if (onUnauthorizedCallback && !isMeProbe) {
        onUnauthorizedCallback();
      }
    }
    return Promise.reject(error);
  }
);

export default api;
