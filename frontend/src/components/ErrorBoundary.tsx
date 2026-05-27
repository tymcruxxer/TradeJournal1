import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button, Panel, StatusBadge } from "./ui";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
        <div className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-2xl items-center">
          <Panel>
            <div className="space-y-5 text-center">
              <StatusBadge tone="danger">Recovery mode</StatusBadge>
              <div>
                <h1 className="text-2xl font-semibold tracking-[-0.03em] text-white">
                  TradeJournal hit a display issue.
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Your session and trade data are protected. Reload the workspace to recover the interface.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <Button
                  variant="primary"
                  onClick={() => {
                    this.setState({ hasError: false });
                    window.location.reload();
                  }}
                >
                  Reload workspace
                </Button>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    );
  }
}
