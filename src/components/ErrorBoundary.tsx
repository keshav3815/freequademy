import { Component, ErrorInfo, ReactNode } from "react";
import { reportError } from "@/lib/monitoring";

interface State {
  hasError: boolean;
}

/**
 * Catches render errors so one broken page does not blank the whole app.
 * Errors are forwarded to the monitoring hook (src/lib/monitoring.ts).
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError(error, { componentStack: info.componentStack ?? undefined });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="max-w-md text-center space-y-4">
            <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
            <p className="text-muted-foreground">
              This page hit an unexpected error. Reloading usually fixes it.
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
              >
                Reload
              </button>
              <a href="/" className="rounded-md border px-4 py-2">Go home</a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
