import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button, Panel, StatusBadge } from "./ui";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  errorLog: string;
};

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorLog: "" };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorLog: error.message || "Unknown error" };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error captured by boundary:", error, info.componentStack);
  }

  handleReset = () => {
    // Clear the error state locally first to let React components attempt to re-render naturally
    this.setState({ hasError: false, errorLog: "" });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
        <div className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-2xl items-center">
          <Panel>
            <div className="space-y-5 text-center">
              <StatusBadge tone="danger">Interface Paused</StatusBadge>
              <div>
                <h1 className="text-2xl font-semibold tracking-[-0.03em] text-white">
                  TradeJournal is waiting for server response.
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Your session and trade data are safe. This usually happens if the backend cloud server is taking a moment to wake up from standby.
                </p>
                {this.state.errorLog && (
                  <p className="mt-2 text-xs font-mono text-amber-300/70 bg-black/30 p-2 rounded max-w-full overflow-x-auto">
                    Log: {this.state.errorLog}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <Button
                  variant="primary"
                  onClick={this.handleReset}
                >
                  Retry Interface
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => window.location.reload()}
                >
                  Hard Reload Page
                </Button>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    );
  }
}