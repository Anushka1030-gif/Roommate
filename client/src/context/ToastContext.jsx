import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ToastContext } from './toastContext.js';
import ToastContainer from '../components/ui/ToastContainer.jsx';

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const removeToast = useCallback((id) => {
    if (timersRef.current.has(id)) {
      clearTimeout(timersRef.current.get(id));
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type = 'info', title = null, message = '', duration = 4000 }) => {
      const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
      const newToast = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        const timer = setTimeout(() => {
          removeToast(id);
        }, duration);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [removeToast]
  );

  // Helper convenience methods
  const toast = useMemo(
    () => ({
      success: (message, options = {}) =>
        addToast({ type: 'success', message, ...options }),
      error: (message, options = {}) =>
        addToast({ type: 'error', message, ...options }),
      warning: (message, options = {}) =>
        addToast({ type: 'warning', message, ...options }),
      info: (message, options = {}) =>
        addToast({ type: 'info', message, ...options }),
    }),
    [addToast]
  );

  // Cleanup timers on unmount
  useEffect(() => {
    const currentTimers = timersRef.current;
    return () => {
      currentTimers.forEach((timer) => clearTimeout(timer));
      currentTimers.clear();
    };
  }, []);

  const value = useMemo(
    () => ({
      toasts,
      addToast,
      removeToast,
      toast,
    }),
    [toasts, addToast, removeToast, toast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export default ToastProvider;
