'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the component tree
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log error to console (in production, send to error tracking service)
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReport = () => {
    // In production, this could send error to your bug tracking service
    const errorReport = {
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };
    
    console.error('[ErrorReport]', errorReport);
    alert('Error report copied to console. Please share this with support.');
  };

  render() {
    // If no error, render children
    if (!this.state.hasError) {
      return this.props.children;
    }

    // If custom fallback provided, use it
    if (this.props.fallback) {
      return this.props.fallback;
    }

    // Default error UI
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="text-red-500" size={40} />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Oops! Something went wrong
          </h1>
          
          <p className="text-gray-600 mb-6">
            We encountered an unexpected error. Don't worry, our team has been notified.
          </p>

          {this.state.error && (
            <div className="mb-6 p-4 bg-gray-50 rounded-xl text-left">
              <p className="text-xs font-mono text-gray-700 break-words">
                {this.state.error.message}
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={this.handleReset}
              className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw size={18} />
              Try Again
            </button>
            
            <button
              onClick={this.handleReport}
              className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Bug size={18} />
              Report Error
            </button>
          </div>

          <p className="text-xs text-gray-400 mt-6">
            Error ID: {this.state.error?.stack?.slice(0, 8) || 'unknown'}
          </p>
        </div>
      </div>
    );
  }
}

/**
 * Hook-based error boundary alternative for functional components
 * Usage: const { error, showError, clearError } = useErrorHandler();
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);
  const [showError, setShowError] = React.useState(false);

  const handleError = React.useCallback((err: Error) => {
    setError(err);
    setShowError(true);
    console.error('[useErrorHandler]', err);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
    setShowError(false);
  }, []);

  return { error, showError, clearError, handleError };
}

export default ErrorBoundary;
