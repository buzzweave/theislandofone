/**
 * URL-only share utility. NEVER sends title, text, or description
 * to prevent iOS/iMessage from receiving HTML content.
 */
export async function shareUrlOnly(url: string) {
  const cleanUrl = String(url).trim();

  // HTML leak guard
  if (/<!doctype|<html|<head|<meta|<\/meta|<\/head|<\/html/i.test(cleanUrl)) {
    console.error("Blocked sharing HTML-like content.");
    return { shared: false };
  }

  // Web Share API — URL only, no title/text
  try {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      await navigator.share({ url: cleanUrl });
      return { shared: true };
    }
  } catch (e: any) {
    if (e?.name === "AbortError") return { shared: false, cancelled: true };
    console.warn("Share failed", e);
  }

  // Fallback: clipboard
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(cleanUrl);
      return { shared: false, copied: true };
    }
  } catch (e) {
    console.warn("Clipboard copy failed", e);
  }

  prompt("Copy this link:", cleanUrl);
  return { shared: false, copied: false };
}
