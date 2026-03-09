import { useState, useRef, useEffect, memo } from "react";

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  /** Placeholder color while loading */
  placeholderColor?: string;
}

/**
 * Optimized image component with:
 * - Intersection Observer lazy loading
 * - Fade-in animation on load
 * - Native lazy/decoding attributes
 * - Error fallback
 */
function OptimizedImageInner({
  src,
  alt,
  className = "",
  width,
  height,
  priority = false,
  placeholderColor,
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(priority);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (priority || !imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" } // Start loading 200px before visible
    );

    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [priority]);

  if (error) {
    return (
      <div
        ref={imgRef}
        className={`bg-muted flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <span className="text-muted-foreground text-xs">Failed to load</span>
      </div>
    );
  }

  return (
    <div ref={imgRef} className="relative" style={{ width, height }}>
      {/* Placeholder */}
      {!loaded && (
        <div
          className={`absolute inset-0 ${className}`}
          style={{ backgroundColor: placeholderColor || "hsl(var(--muted))" }}
        />
      )}
      {inView && (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={`transition-opacity duration-300 ${
            loaded ? "opacity-100" : "opacity-0"
          } ${className}`}
        />
      )}
    </div>
  );
}

const OptimizedImage = memo(OptimizedImageInner);
export default OptimizedImage;
