import { useRef, useState, useEffect, type ReactNode } from "react";

interface LazySectionProps {
  children: ReactNode;
  /** Placeholder height to prevent CLS */
  minHeight?: string;
  /** How far before the section enters viewport to start rendering */
  rootMargin?: string;
}

/**
 * Defers rendering of children until the section is near the viewport.
 * Prevents data-fetching and DOM creation for below-fold content.
 */
export default function LazySection({
  children,
  minHeight = "200px",
  rootMargin = "400px",
}: LazySectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  if (visible) return <>{children}</>;

  return <div ref={ref} style={{ minHeight }} />;
}
