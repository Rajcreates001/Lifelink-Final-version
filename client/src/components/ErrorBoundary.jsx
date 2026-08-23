import React from 'react';

/**
 * Error Boundary — catches React rendering errors and shows a fallback UI.
 * Prevents the entire app from crashing when a single component fails.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary] Component error:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      const errorTitle = this.props.fallbackTitle || 'Something went wrong';
      const errorMessage = this.state.error?.message || 'An unexpected error occurred.';

      return (
        <div className="min-h-[200px] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-xl border border-red-200 shadow-lg p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-exclamation-triangle text-red-500 text-lg" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{errorTitle}</h3>
            <p className="text-sm text-gray-500 mb-4">
              {errorMessage.length > 200 ? errorMessage.slice(0, 200) + '...' : errorMessage}
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors"
              >
                Reload Page
              </button>
            </div>
            {import.meta.env.DEV && this.state.errorInfo && (
              <details className="mt-4 text-left">
                <summary className="text-xs text-gray-400 cursor-pointer">Error Details (Dev)</summary>
                <pre className="text-xs text-red-600 mt-2 overflow-auto max-h-40 bg-red-50 p-2 rounded">
                  {this.state.error?.stack}
                  {'\n\n'}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
