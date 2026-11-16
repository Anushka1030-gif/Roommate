import React from 'react';
import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[70vh] flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 sm:p-8 text-center space-y-4 border-surface-border shadow-lg">
            <div className="w-14 h-14 rounded-2xl bg-[#C75146]/10 text-[#C75146] border border-[#C75146]/20 flex items-center justify-center mx-auto">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <div>
              <h2 className="text-xl font-bold text-text-primary tracking-tight">
                Something unexpected happened
              </h2>
              <p className="text-xs sm:text-sm text-text-secondary mt-1 leading-relaxed">
                An error occurred while rendering this page. Your data is safe.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 bg-beige-50/70 border border-surface-border rounded-xl text-left text-xs text-text-primary font-mono overflow-x-auto">
                {this.state.error.message}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button variant="outline" size="md" onClick={this.handleReload}>
                Reload Page
              </Button>
              <Button variant="primary" size="md" onClick={this.handleReset}>
                Return Home
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

