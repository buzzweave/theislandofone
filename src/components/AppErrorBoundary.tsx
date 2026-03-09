import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AppErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("App crashed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f1117",
          color: "#e2e8f0",
          fontFamily: "Inter, system-ui, sans-serif",
          padding: "2rem",
          textAlign: "center",
        }}>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#94a3b8", marginBottom: "1.5rem", maxWidth: "400px" }}>
            We're sorry — the page couldn't load. Please try refreshing.
          </p>
          <button
            onClick={() => {
              // Clear service workers and caches, then reload
              if ("serviceWorker" in navigator) {
                navigator.serviceWorker.getRegistrations().then((registrations) => {
                  registrations.forEach((reg) => reg.unregister());
                });
                caches.keys().then((names) => {
                  names.forEach((name) => caches.delete(name));
                });
              }
              window.location.reload();
            }}
            style={{
              background: "#3b82f6",
              color: "white",
              border: "none",
              padding: "0.75rem 2rem",
              borderRadius: "0.5rem",
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
