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
  <div style={{ padding: '2rem', textAlign: 'center' }}>
    <h2>Something went wrong.</h2>
    <p>Please refresh the page. Our team has been notified.</p>
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
        <div>
          {this.props.fallback || defaultFallback}
          <button
            type="button"
            onClick={this.handleReset}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid #ccc'
            }}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
