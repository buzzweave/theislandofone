import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  if (installed) return null;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  const handleClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

  // Only show if we can install or on iOS
  if (!deferredPrompt && !isIOS) return null;

  return (
    <>
      <button
        onClick={handleClick}
        className="hidden sm:inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
      >
        <Download className="h-3.5 w-3.5" />
        Get App
      </button>

      {/* iOS instructions modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-sm mx-auto shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold text-foreground">Install App</h3>
              <button onClick={() => setShowIOSModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>To install this app on your iPhone or iPad:</p>
              <ol className="list-decimal list-inside space-y-2">
                <li>Tap the <strong className="text-foreground">Share</strong> button in Safari (square with arrow)</li>
                <li>Scroll down and tap <strong className="text-foreground">Add to Home Screen</strong></li>
                <li>Tap <strong className="text-foreground">Add</strong> to confirm</li>
              </ol>
            </div>
            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full px-4 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
