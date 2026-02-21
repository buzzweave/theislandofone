/**
 * Universal mobile-safe download helper.
 * Desktop: uses blob URLs (fast, no upload needed).
 * iOS: uploads to cloud storage for a real HTTPS URL so Safari's native
 *       download sheet triggers and files appear in the Files app.
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
  if (isIOS()) {
    // iOS Safari needs a real HTTPS URL to trigger the native download sheet
    await iosStorageDownload(blob, filename);
  } else {
    // Desktop / Android: blob URL works reliably
    blobDownload(blob, filename);
  }
}

/** Desktop / Android: simple blob URL download */
function blobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** iOS: upload to public storage bucket and navigate to the HTTPS URL */
async function iosStorageDownload(blob: Blob, filename: string) {
  const uniquePath = `${crypto.randomUUID()}/${filename}`;
  const contentType = getMimeType(filename);

  const { error } = await supabase.storage
    .from("downloads")
    .upload(uniquePath, blob, {
      contentType,
      cacheControl: "no-store",
      upsert: false,
    });

  if (error) {
    console.error("Storage upload failed, falling back to blob URL:", error);
    // Fallback: try blob URL anyway (may not work on all iOS versions)
    blobDownload(blob, filename);
    return;
  }

  const { data: urlData } = supabase.storage
    .from("downloads")
    .getPublicUrl(uniquePath);

  // Force Safari's native download sheet — file appears in Files app
  window.location.href = urlData.publicUrl;

  // Clean up the temporary file after a delay (best-effort)
  setTimeout(async () => {
    await supabase.storage.from("downloads").remove([uniquePath]);
  }, 60_000);
}
