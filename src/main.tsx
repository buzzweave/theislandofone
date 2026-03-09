import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

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
