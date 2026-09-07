// client/src/components/ErrorBoundary.jsx
// Catches render-time errors in dashboard subtrees and shows a recovery UI
// instead of a blank page. Emergency software must degrade visibly, not vanish.
import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // eslint-disable-next-line no-console
    console.error('[LifeLink] UI error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const compact = this.props.compact;
      return (
        <div
          className={`flex items-center justify-center ${compact ? 'p-6' : 'min-h-[50vh] p-12'}`}
          role="alert"
        >
          <div className="max-w-md w-full text-center rounded-2xl border border-red-100 bg-red-50/60 p-6">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-2xl">
              ⚠️
            </div>
            <h2 className="mb-1 text-base font-bold text-slate-800">
              {this.props.title || 'Something went wrong'}
            </h2>
            <p className="mb-4 text-xs text-slate-500">
              This panel hit an unexpected error. Your data is safe — use the button below to retry, or reload the page.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={this.handleReset}
                className="rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Try again
              </button>
              <button
                onClick={this.handleReload}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                Reload page
              </button>
            </div>
            {import.meta.env.DEV && this.state.error && (
              <pre className="mt-4 max-h-32 overflow-auto rounded-lg bg-slate-900 p-3 text-left text-[10px] text-red-300 whitespace-pre-wrap">
                {String(this.state.error)}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
