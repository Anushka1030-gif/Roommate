import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastProvider } from '../context/ToastContext.jsx';
import { useToast } from '../hooks/useToast.js';

function TestConsumer() {
  const { toast, addToast } = useToast();

  return (
    <div>
      <button
        type="button"
        onClick={() => toast.success('Profile updated successfully!', { title: 'Success' })}
      >
        Trigger Success Toast
      </button>
      <button
        type="button"
        onClick={() => toast.error('Connection timed out', { title: 'Network Error' })}
      >
        Trigger Error Toast
      </button>
      <button
        type="button"
        onClick={() => toast.warning('Profile is incomplete')}
      >
        Trigger Warning Toast
      </button>
      <button
        type="button"
        onClick={() => toast.info('New message received')}
      >
        Trigger Info Toast
      </button>
      <button
        type="button"
        onClick={() => addToast({ message: 'Auto-dismiss in 1000ms', duration: 1000 })}
      >
        Trigger Auto-Dismiss Toast
      </button>
    </div>
  );
}

describe('Toast Notification System', () => {
  it('throws error when useToast is used outside ToastProvider', () => {
    // Suppress console.error in this test for cleaner output
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    function InvalidComponent() {
      useToast();
      return <div>Invalid</div>;
    }

    expect(() => render(<InvalidComponent />)).toThrow(
      'useToast must be used within a ToastProvider'
    );

    consoleErrorSpy.mockRestore();
  });

  it('renders and displays toasts with title and message', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Trigger Success Toast'));

    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Profile updated successfully!')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('supports different toast variants: error, warning, info', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Trigger Error Toast'));
    fireEvent.click(screen.getByText('Trigger Warning Toast'));
    fireEvent.click(screen.getByText('Trigger Info Toast'));

    expect(screen.getByText('Network Error')).toBeInTheDocument();
    expect(screen.getByText('Connection timed out')).toBeInTheDocument();
    expect(screen.getByText('Profile is incomplete')).toBeInTheDocument();
    expect(screen.getByText('New message received')).toBeInTheDocument();

    const alerts = screen.getAllByRole('alert');
    expect(alerts).toHaveLength(3);
  });

  it('dismisses toast on manual close button click', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Trigger Success Toast'));
    expect(screen.getByText('Profile updated successfully!')).toBeInTheDocument();

    const closeBtn = screen.getByLabelText(/dismiss notification/i);
    fireEvent.click(closeBtn);

    expect(screen.queryByText('Profile updated successfully!')).not.toBeInTheDocument();
  });

  it('auto-dismisses toast after specified duration', () => {
    vi.useFakeTimers();

    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Trigger Auto-Dismiss Toast'));
    expect(screen.getByText('Auto-dismiss in 1000ms')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.queryByText('Auto-dismiss in 1000ms')).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});
