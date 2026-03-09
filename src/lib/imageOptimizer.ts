/**
 * Client-side image optimization utilities.
 * Compresses images before upload to reduce bandwidth and speed up transfers.
 */

interface OptimizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: "image/webp" | "image/jpeg";
}

const DEFAULT_OPTIONS: OptimizeOptions = {
  maxWidth: 2400,
  maxHeight: 2400,
  quality: 0.82,
  format: "image/webp",
};

/**
 * Compress and optionally resize an image file using Canvas.
 * Returns a new File with optimized data.
 */
export async function optimizeImage(
  file: File,
  opts: OptimizeOptions = {}
): Promise<File> {
  const options = { ...DEFAULT_OPTIONS, ...opts };

  // Skip non-image files or very small files (< 50KB)
  if (!file.type.startsWith("image/") || file.size < 50_000) {
    return file;
  }

  // Skip SVGs — can't optimize via canvas
  if (file.type === "image/svg+xml") return file;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      const maxW = options.maxWidth!;
      const maxH = options.maxHeight!;

      // Scale down if needed
      if (width > maxW || height > maxH) {
        const ratio = Math.min(maxW / width, maxH / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            // Optimization didn't help, use original
            resolve(file);
            return;
          }
          const ext = options.format === "image/webp" ? "webp" : "jpg";
          const name = file.name.replace(/\.[^.]+$/, `.${ext}`);
          resolve(new File([blob], name, { type: options.format }));
        },
        options.format,
        options.quality
      );
    };
    img.onerror = () => resolve(file); // Fallback to original on error
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Generate a small thumbnail from an image file.
 */
export async function generateThumbnail(
  file: File,
  maxSize = 400
): Promise<File> {
  return optimizeImage(file, {
    maxWidth: maxSize,
    maxHeight: maxSize,
    quality: 0.7,
    format: "image/webp",
  });
}

/**
 * Upload multiple files in parallel batches with progress tracking.
 * Returns results as they complete.
 */
export async function parallelUpload<T>(
  items: T[],
  uploadFn: (item: T, index: number) => Promise<void>,
  options: {
    concurrency?: number;
    onProgress?: (completed: number, total: number) => void;
    onItemComplete?: (index: number) => void;
  } = {}
): Promise<{ successes: number; failures: number }> {
  const { concurrency = 3, onProgress, onItemComplete } = options;
  let completed = 0;
  let failures = 0;
  const total = items.length;

  // Process in concurrent batches
  const queue = [...items.map((item, i) => ({ item, index: i }))];
  const workers: Promise<void>[] = [];

  for (let w = 0; w < Math.min(concurrency, queue.length); w++) {
    workers.push(
      (async () => {
        while (queue.length > 0) {
          const entry = queue.shift();
          if (!entry) break;
          try {
            await uploadFn(entry.item, entry.index);
          } catch {
            failures++;
          }
          completed++;
          onProgress?.(completed, total);
          onItemComplete?.(entry.index);
        }
      })()
    );
  }

  await Promise.all(workers);
  return { successes: completed - failures, failures };
}
