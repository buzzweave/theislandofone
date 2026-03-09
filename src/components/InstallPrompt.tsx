import { useState, useEffect, useCallback } from "react";
import { Download, X, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const isIOS =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as any).MSStream;

  const isAndroid =
    typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);

  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true);

  useEffect(() => {
    if (isStandalone) {
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
  }, [isStandalone]);

  const handleClick = useCallback(async () => {
    // Android / Desktop Chrome — use native install prompt
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setDeferredPrompt(null);
      return;
    }

    // iOS — show guided overlay (no programmatic install on iOS)
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
  }, [deferredPrompt, isIOS]);

  if (installed) return null;

  // Show on: Android/Desktop with prompt available, or iOS, or Android without prompt (fallback)
  const canShow = deferredPrompt || isIOS || isAndroid;
  if (!canShow) return null;

  return (
    <>
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
      >
        <Download className="h-3.5 w-3.5" />
        Get App
      </button>

      {/* iOS Install Guide Overlay */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 animate-fade-in"
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            className="w-full max-w-md bg-card border-t border-border rounded-t-2xl p-6 pb-10 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold">Install The Island of One</h3>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">1</div>
                <p className="text-sm text-muted-foreground pt-1">
                  Tap the <Share className="inline h-4 w-4 text-primary mx-0.5 -mt-0.5" /> <strong className="text-foreground">Share</strong> button at the bottom of Safari
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">2</div>
                <p className="text-sm text-muted-foreground pt-1">
                  Scroll down and tap <strong className="text-foreground">Add to Home Screen</strong>
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">3</div>
                <p className="text-sm text-muted-foreground pt-1">
                  Tap <strong className="text-foreground">Add</strong> — the app will appear on your home screen
                </p>
              </div>
            </div>

            <div className="mt-6 p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-xs text-muted-foreground">
                The app works offline and opens full screen — just like a native app.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
