/**
 * Universal mobile-safe download helper.
 * Uploads the blob to cloud storage and triggers download via a real HTTPS URL.
 * This ensures iPad/iPhone Safari triggers its native download sheet and files
 * appear in the Files app.
 */

import { supabase } from "@/integrations/supabase/client";

function isIOS(): boolean {
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** Map common file extensions to MIME types for correct Content-Type headers */
function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "epub":
      return "application/epub+zip";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    default:
      return "application/octet-stream";
  }
}

export async function triggerDownload(blob: Blob, filename: string) {
  const uniquePath = `${crypto.randomUUID()}/${filename}`;
  const contentType = getMimeType(filename);

  // Upload to the public downloads bucket with the correct content type
  const { error } = await supabase.storage
    .from("downloads")
    .upload(uniquePath, blob, {
      contentType,
      cacheControl: "no-store",
      upsert: false,
    });

  if (error) {
    console.error("Storage upload failed, falling back to blob URL:", error);
    // Fallback: try the old blob-URL method for desktop at least
    fallbackBlobDownload(blob, filename);
    return;
  }

  const { data: urlData } = supabase.storage
    .from("downloads")
    .getPublicUrl(uniquePath);

  const publicUrl = urlData.publicUrl;

  if (isIOS()) {
    // Force Safari's native download sheet – file appears in Files app
    window.location.href = publicUrl;
  } else {
    const a = document.createElement("a");
    a.href = publicUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // Clean up the temporary file after a delay (best-effort)
  setTimeout(async () => {
    await supabase.storage.from("downloads").remove([uniquePath]);
  }, 60_000);
}

/** Fallback for when storage upload fails */
function fallbackBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
