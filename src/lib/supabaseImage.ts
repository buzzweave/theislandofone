/**
 * Append Supabase Storage image transformation parameters
 * to resize and convert images on-the-fly. Browser sends Accept: image/webp
 * automatically, so served bytes shrink dramatically (e.g., 1.1MB PNG → 80KB WebP).
 * Only applies to URLs from our Supabase storage `/object/public/` endpoint.
 */

const SUPABASE_STORAGE_HOST = "zovakngafdwzbqhwvssf.supabase.co";

interface TransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  resize?: "cover" | "contain" | "fill";
}

export function supabaseImageUrl(
  url: string | undefined | null,
  opts: TransformOptions = {}
): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    if (u.host !== SUPABASE_STORAGE_HOST) return url;
    // Rewrite /object/public/ → /render/image/public/
    if (!u.pathname.includes("/storage/v1/object/public/")) return url;
    u.pathname = u.pathname.replace(
      "/storage/v1/object/public/",
      "/storage/v1/render/image/public/"
    );
    if (opts.width) u.searchParams.set("width", String(opts.width));
    if (opts.height) u.searchParams.set("height", String(opts.height));
    u.searchParams.set("quality", String(opts.quality ?? 70));
    if (opts.resize) u.searchParams.set("resize", opts.resize);
    return u.toString();
  } catch {
    return url;
  }
}

/** Build srcset for responsive images. */
export function supabaseImageSrcSet(
  url: string | undefined | null,
  widths: number[] = [400, 800, 1200],
  quality = 70
): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    if (u.host !== SUPABASE_STORAGE_HOST) return undefined;
  } catch {
    return undefined;
  }
  return widths
    .map((w) => `${supabaseImageUrl(url, { width: w, quality })} ${w}w`)
    .join(", ");
}
