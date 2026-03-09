/**
 * Append Supabase Storage image transformation parameters
 * to resize and convert images on-the-fly (WebP, quality, width).
 * Only applies to URLs from our Supabase storage bucket.
 */

const SUPABASE_STORAGE_HOST = "zovakngafdwzbqhwvssf.supabase.co";

interface TransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: "webp" | "avif";
}

export function supabaseImageUrl(
  url: string | undefined | null,
  _opts: TransformOptions = {}
): string {
  if (!url) return "";
  // Return original URL — Supabase render/image endpoint is not available
  return url;
}
