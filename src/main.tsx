import { createRoot } from "react-dom/client";
import { Component, type ReactNode } from "react";
import App from "./App.tsx";
import "./index.css";

/** Top-level error boundary — catches ANY React render crash */
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
            We're having trouble loading the page. Please try again.
          </p>
          <button
            onClick={() => {
              // Unregister service workers, clear caches, and hard reload
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
              setTimeout(() => window.location.reload(), 300);
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
          <p style={{ color: "#64748b", fontSize: "0.7rem", marginTop: "1.5rem", maxWidth: "24rem" }}>
            Error: {this.state.error?.message || "Unknown error"}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

// Wrap the entire app boot in try-catch so even module-level errors get caught
try {
  const root = document.getElementById("root");
  if (root) {
    createRoot(root).render(
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    );
  }
} catch (err) {
  console.error("[BOOT CRASH]", err);
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML =
      '<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#1a1d26;color:#e2e8f0;font-family:Inter,system-ui,sans-serif;padding:2rem;text-align:center">' +
      '<h1 style="font-size:1.5rem;font-weight:700;margin-bottom:0.75rem">App failed to start</h1>' +
      '<p style="color:#94a3b8;margin-bottom:1rem">' + (err instanceof Error ? err.message : "Unknown error") + '</p>' +
      '<button onclick="location.reload()" style="padding:0.75rem 2rem;border-radius:9999px;background:#c8a84e;color:#1a1d26;font-weight:600;font-size:0.875rem;border:none;cursor:pointer">Reload</button>' +
      "</div>";
  }
}

// Service worker management
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!sessionStorage.getItem("sw-reloaded")) {
      sessionStorage.setItem("sw-reloaded", "1");
      window.location.reload();
    }
  });

  window.addEventListener("load", () => {
    sessionStorage.removeItem("sw-reloaded");
  });
}
