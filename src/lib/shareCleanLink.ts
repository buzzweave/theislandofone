export async function shareCleanLink({
  title,
  description,
  url,
}: {
  title?: string;
  description?: string;
  url: string;
}) {
  const cleanUrl = String(url);

  const cleanText = description
    ? String(description)
        .replace(/<[^>]*>?/gm, "")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 160)
    : "";

  const shareData: ShareData = {
    title: title || "The Island of One",
    text: cleanText,
    url: cleanUrl,
  };

  try {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      await navigator.share(shareData);
      return { shared: true };
    }
  } catch (e: any) {
    if (e?.name === "AbortError") {
      return { shared: false, cancelled: true };
    }
    console.warn("Share failed", e);
  }

  // Fallback: copy ONLY URL
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(cleanUrl);
      return { shared: false, copied: true };
    }
  } catch (e) {
    console.warn("Clipboard copy failed", e);
  }

  // Last resort
  prompt("Copy this link:", cleanUrl);
  return { shared: false, copied: false };
}
