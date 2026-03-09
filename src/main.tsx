import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

try {
  createRoot(document.getElementById("root")!).render(<App />);
} catch (err) {
  console.error("Root render error:", err);
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML = `<div style="color:white;padding:2rem;font-family:sans-serif"><h1>Something went wrong</h1><pre>${String(err)}</pre></div>`;
  }
}

// Detect service worker updates and reload to serve latest version
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!sessionStorage.getItem("sw-reloaded")) {
      sessionStorage.setItem("sw-reloaded", "1");
      window.location.reload();
    }
  });

  // Clear the reload guard after the page has fully loaded
  window.addEventListener("load", () => {
    sessionStorage.removeItem("sw-reloaded");
  });
}
