import React, { Component } from 'react';
import { logger } from '../../lib/logger';

type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error | null;
};

const defaultFallback = (
  <div className="p-8 text-center bg-surface rounded-lg border border-border shadow-sm max-w-md mx-auto mt-10">
    <h2 className="text-xl font-bold text-primary mb-2">Something went wrong.</h2>
    <p className="text-secondary mb-4">Please refresh the page. Our team has been notified.</p>
  </div>
);

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error('react.error_boundary', {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      componentStack: info.componentStack
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="bg-surface p-8 rounded-xl border border-border shadow-lg text-center max-w-md w-full">
            <h2 className="text-xl font-bold text-primary mb-2">Something went wrong</h2>
            <p className="text-secondary mb-6">Please refresh the page. Our team has been notified.</p>
            {this.props.fallback}
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
