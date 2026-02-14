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
  const url = URL.createObjectURL(blob);

  if (isIOS()) {
    // iOS Safari blocks programmatic <a> clicks – open in a new tab instead
    const win = window.open(url, "_blank");
    if (!win) {
      // Popup blocked – fall back to location change
      window.location.href = url;
    }
    // Revoke after a generous delay so the browser can finish loading
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } else {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}
