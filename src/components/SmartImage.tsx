import { useState, ImgHTMLAttributes } from "react";
import { supabaseImageUrl, supabaseImageSrcSet } from "@/lib/supabaseImage";
import { cn } from "@/lib/utils";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet"> & {
  src: string | undefined | null;
  alt: string;
  /** Display width hint used for the base src. Defaults to 800. */
  displayWidth?: number;
  /** Widths emitted in srcset. Defaults to [400, 800, 1200]. */
  widths?: number[];
  /** Responsive sizes attribute. */
  sizes?: string;
  /** JPEG/WebP quality (10-100). Defaults to 70. */
  quality?: number;
  /** Mark as eager + high priority (LCP). */
  priority?: boolean;
  /** Optional wrapper className for the aspect/skeleton box. */
  wrapperClassName?: string;
};

/**
 * Responsive image with:
 *  - Supabase storage on-the-fly resize + WebP
 *  - srcset / sizes for mobile/tablet/desktop
 *  - Skeleton shimmer until loaded
 *  - Soft blur-up fade-in
 *  - Lazy loading by default (eager when priority)
 */
export default function SmartImage({
  src,
  alt,
  displayWidth = 800,
  widths = [400, 800, 1200],
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  quality = 70,
  priority = false,
  className,
  wrapperClassName,
  ...rest
}: Props) {
  const [loaded, setLoaded] = useState(false);

  const resolvedSrc = supabaseImageUrl(src, { width: displayWidth, quality }) || src || "";
  const srcSet = supabaseImageSrcSet(src, widths, quality);
  const tinyBlur =
    supabaseImageUrl(src, { width: 24, quality: 30 }) || undefined;

  return (
    <div className={cn("relative overflow-hidden bg-muted", wrapperClassName)}>
      {/* Skeleton shimmer */}
      {!loaded && (
        <div
          aria-hidden
          className="absolute inset-0 animate-pulse bg-gradient-to-r from-muted via-muted-foreground/10 to-muted"
        />
      )}
      {/* Blur-up preview */}
      {!loaded && tinyBlur && (
        <img
          aria-hidden
          src={tinyBlur}
          alt=""
          className={cn("absolute inset-0 w-full h-full object-cover scale-110 blur-xl", className)}
        />
      )}
      <img
        src={resolvedSrc}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        // @ts-expect-error - fetchpriority is valid HTML
        fetchpriority={priority ? "high" : "auto"}
        onLoad={() => setLoaded(true)}
        className={cn(
          "relative transition-opacity duration-500",
          loaded ? "opacity-100" : "opacity-0",
          className
        )}
        {...rest}
      />
    </div>
  );
}
