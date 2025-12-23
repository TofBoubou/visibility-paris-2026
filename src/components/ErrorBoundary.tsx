"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="p-4 rounded-full bg-brand-pink/10 mb-4">
            <AlertTriangle className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Oups, une erreur est survenue
          </h2>
          <p className="text-gray-600 mb-6 max-w-md">
            Nous nous excusons pour la gêne occasionnée. Veuillez réessayer ou
            rafraîchir la page.
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-brand-pink text-white rounded-lg hover:bg-brand-pink/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Réessayer
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-brand-blue/20 transition-colors"
            >
              Rafraîchir la page
            </button>
          </div>
          {process.env.NODE_ENV === "development" && this.state.error && (
            <details className="mt-6 text-left w-full max-w-2xl">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-900">
                Détails techniques
              </summary>
              <pre className="mt-2 p-4 bg-gray-100 rounded-lg text-xs overflow-x-auto text-gray-600">
                {this.state.error.message}
                {"\n\n"}
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components
export function ErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-6 text-center bg-white rounded-xl border border-gray-200">
      <AlertTriangle className="w-8 h-8 text-blue-600 mb-3" />
      <h3 className="font-bold text-gray-900 mb-2">Erreur de chargement</h3>
      <p className="text-sm text-gray-600 mb-4">{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-brand-pink text-white rounded-lg hover:bg-brand-pink/90 transition-colors"
      >
        <RefreshCw className="w-3 h-3" />
        Réessayer
      </button>
    </div>
  );
}
