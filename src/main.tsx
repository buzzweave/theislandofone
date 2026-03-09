import { createRoot } from "react-dom/client";
import { Component, type ReactNode } from "react";
import App from "./App.tsx";
import "./index.css";

/** Top-level error boundary so production never shows a blank screen */
class RootErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[RootErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#1a1d26",
            color: "#e2e8f0",
            fontFamily: "Inter, system-ui, sans-serif",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.75rem" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#94a3b8", marginBottom: "1.5rem", maxWidth: "28rem" }}>
            We're having trouble loading the page. This is usually temporary.
          </p>
          <button
            onClick={() => {
              // Clear service worker caches then reload
              if ("caches" in window) {
                caches.keys().then((names) => {
                  names.forEach((name) => caches.delete(name));
                });
              }
              window.location.reload();
            }}
            style={{
              padding: "0.75rem 2rem",
              borderRadius: "9999px",
              background: "#c8a84e",
              color: "#1a1d26",
              fontWeight: 600,
              fontSize: "0.875rem",
              border: "none",
              cursor: "pointer",
            }}
          >
            Reload Page
          </button>
          <button
            onClick={() => {
              // Hard reset: unregister SW, clear caches, reload
              if ("serviceWorker" in navigator) {
                navigator.serviceWorker.getRegistrations().then((regs) => {
                  regs.forEach((r) => r.unregister());
                });
              }
              if ("caches" in window) {
                caches.keys().then((names) => {
                  names.forEach((name) => caches.delete(name));
                });
              }
              setTimeout(() => (window.location.href = "/"), 500);
            }}
            style={{
              marginTop: "0.75rem",
              padding: "0.5rem 1.5rem",
              borderRadius: "9999px",
              background: "transparent",
              color: "#94a3b8",
              fontWeight: 500,
              fontSize: "0.75rem",
              border: "1px solid #334155",
              cursor: "pointer",
            }}
          >
            Clear Cache &amp; Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <RootErrorBoundary>
    <App />
  </RootErrorBoundary>
);

// Service worker update handler + stale cache cleanup on every load
if ("serviceWorker" in navigator) {
  // When a new SW takes over, reload once to serve fresh assets
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!sessionStorage.getItem("sw-reloaded")) {
      sessionStorage.setItem("sw-reloaded", "1");
      window.location.reload();
    }
  });

  window.addEventListener("load", () => {
    sessionStorage.removeItem("sw-reloaded");

    // Proactively clean stale workbox caches on every page load
    if ("caches" in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          // Remove old workbox precache buckets that may reference deleted chunks
          if (name.includes("workbox-precache") || name.includes("sw-precache")) {
            caches.delete(name);
          }
        });
      });
    }
  });
}
