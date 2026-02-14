/**
 * Cross-browser download helper that works on iOS Safari, Android, and desktop.
 */

function isIOS(): boolean {
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function triggerDownload(blob: Blob, filename: string) {
  if (isIOS()) {
    // Convert blob to data URL – iPad Safari handles data URLs reliably
    // unlike blob URLs which are silently blocked
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const win = window.open(dataUrl, "_blank");
      if (!win) {
        // Popup blocked – try location change as last resort
        window.location.href = dataUrl;
      }
    };
    reader.readAsDataURL(blob);
  } else {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}
