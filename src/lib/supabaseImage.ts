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
  opts: TransformOptions = {}
): string {
  if (!url) return "";

  // Only transform Supabase storage URLs
  if (!url.includes(SUPABASE_STORAGE_HOST)) return url;

  // Convert /object/public/ to /render/image/public/ for transformations
  const transformUrl = url.replace(
    "/storage/v1/object/public/",
    "/storage/v1/render/image/public/"
  );

  const params = new URLSearchParams();
  if (opts.width) params.set("width", String(opts.width));
  if (opts.height) params.set("height", String(opts.height));
  params.set("quality", String(opts.quality ?? 75));
  params.set("format", opts.format ?? "webp");

  return `${transformUrl}?${params.toString()}`;
}
