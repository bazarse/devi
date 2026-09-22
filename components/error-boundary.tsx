'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  title?: string;
  description?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Localized ErrorBoundary caught an error:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const title = this.props.title || 'Unable to Load Section';
      const description =
        this.props.description ||
        'A localized render issue occurred in this section. The rest of the application remains fully functional.';

      return (
        <div className="w-full my-4 p-6 sm:p-8 rounded-3xl bg-white border border-rose-200 shadow-sm text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <h3 className="text-base sm:text-lg font-black text-slate-900 mb-1">{title}</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">{description}</p>

          {this.state.error?.message && (
            <div className="mb-4 max-w-md mx-auto p-3 bg-slate-50 border border-slate-200 rounded-xl text-left overflow-x-auto text-[11px] font-mono text-rose-700 max-h-24">
              {this.state.error.message}
            </div>
          )}

          <div className="flex justify-center">
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition-all active:scale-95 min-h-[44px] min-w-[120px]"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retry Section</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
