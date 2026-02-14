/**
 * GOODNOTES PULPIT FORMAT (A4) — Shared Parsing Engine
 *
 * Detects MAIN POINT headings in sermon manuscripts, groups bullets,
 * and provides page-layout calculations for all export formats.
 */

// ── Types ───────────────────────────────────────────────────────────────

export interface PulpitSection {
  heading: string;
  bullets: string[];
}

export interface PulpitData {
  title: string;
  scripture: string;
  sections: PulpitSection[];
}

// ── Constants ───────────────────────────────────────────────────────────

/** A4 portrait in points */
export const A4_W = 595;
export const A4_H = 842;
export const MARGIN = 72; // 1 inch
export const CONTENT_W = A4_W - MARGIN * 2;
export const USABLE_H = A4_H - MARGIN * 2; // 698 pt

export const FONT = {
  title: { size: 44, leading: 52 },
  scriptureHeader: { size: 24, leading: 32 },
  scriptureText: { size: 18, leading: 26 },
  mainPoint: { size: 28, leading: 36 },
  bullet: { size: 16, leading: 24 },
  copyright: { size: 9, leading: 14 },
} as const;

export const MIN_BULLETS_PER_PAGE = 4;
export const MAX_BULLETS_PER_PAGE = 4;

// ── HTML Stripping ──────────────────────────────────────────────────────

export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

// ── Bold-Based Heading Detection ────────────────────────────────────────

/**
 * Extract bold text segments from HTML. Returns an array of plain-text
 * strings that were wrapped in <strong> or <b> tags.
 */
function extractBoldSegments(html: string): Set<string> {
  const bolds = new Set<string>();
  const re = /<(?:strong|b)(?:\s[^>]*)?>(.+?)<\/(?:strong|b)>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const text = m[1]
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .trim();
    if (text.length > 0) bolds.add(text);
  }
  return bolds;
}

/** Ensure each bullet is at most ~2 sentences. */
function splitLongBullet(text: string): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+[\s]*/g);
  if (!sentences || sentences.length <= 2) return [text.trim()];

  const result: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    const chunk = (sentences[i] + (sentences[i + 1] || "")).trim();
    if (chunk) result.push(chunk);
  }
  return result;
}

// ── Main Parser ─────────────────────────────────────────────────────────

export function parsePulpitFormat(manuscript: string, title: string, scripture: string): PulpitData {
  // Step 1: Extract bold segments from raw HTML BEFORE stripping tags
  const boldSegments = manuscript.includes("<") ? extractBoldSegments(manuscript) : new Set<string>();

  // Step 2: Strip HTML for line-based parsing
  const raw = manuscript.includes("<") ? stripHtml(manuscript) : manuscript;
  const lines = raw.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

  // Normalise title & scripture for comparison
  const titleNorm = title.trim().toLowerCase();
  const scriptureNorm = scripture?.trim().toLowerCase() || "";

  const sections: PulpitSection[] = [];
  let current: PulpitSection | null = null;

  for (const line of lines) {
    const lineNorm = line.trim().toLowerCase();

    // Skip lines that are just the title or scripture (they're on the title page)
    if (lineNorm === titleNorm || (scriptureNorm && lineNorm === scriptureNorm)) continue;

    // A line is a MAIN POINT if its text was bold in the original HTML
    const isBoldHeading = [...boldSegments].some(
      (b) => b.toLowerCase() === lineNorm || lineNorm.startsWith(b.toLowerCase())
    );

    if (isBoldHeading) {
      current = { heading: line, bullets: [] };
      sections.push(current);
    } else if (current) {
      const split = splitLongBullet(line);
      current.bullets.push(...split);
    } else {
      // Content before any heading — create an intro section
      current = { heading: "", bullets: [line] };
      sections.push(current);
    }
  }

  return { title, scripture, sections };
}

// ── Page Layout Calculator ──────────────────────────────────────────────

export interface PageSlice {
  heading: string; // Empty string for continuation pages
  bullets: string[];
}

/**
 * Takes parsed sections and splits them into page-sized slices.
 * Each MAIN POINT starts a new page. Bullets are capped at MAX_BULLETS_PER_PAGE.
 * No orphan bullets (min 2 if splitting).
 */
export function layoutPages(sections: PulpitSection[]): PageSlice[] {
  const pages: PageSlice[] = [];

  for (const section of sections) {
    const { heading, bullets } = section;

    if (bullets.length <= MAX_BULLETS_PER_PAGE) {
      pages.push({ heading, bullets: [...bullets] });
    } else {
      // Split into multiple pages
      let remaining = [...bullets];
      let first = true;

      while (remaining.length > 0) {
        // Determine how many bullets on this page
        let take = Math.min(MAX_BULLETS_PER_PAGE, remaining.length);

        // If what's left after taking would be < 2 (orphan), adjust
        const leftover = remaining.length - take;
        if (leftover > 0 && leftover < 2) {
          take = remaining.length - 2; // leave at least 2 for next page
        }

        // Enforce minimum unless it's the last page
        if (take < MIN_BULLETS_PER_PAGE && remaining.length > take) {
          take = MIN_BULLETS_PER_PAGE;
        }

        pages.push({
          heading: first ? heading : "",
          bullets: remaining.slice(0, take),
        });

        remaining = remaining.slice(take);
        first = false;
      }
    }
  }

  return pages;
}

// ── Empty-Section Cleanup ────────────────────────────────────────────────

/** Merge sections with 0 bullets into neighbors to prevent blank pages. */
export function cleanupSections(sections: PulpitSection[]): PulpitSection[] {
  const result: PulpitSection[] = [];
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    if (s.bullets.length === 0 && s.heading) {
      const next = sections[i + 1];
      if (next) {
        next.bullets = [s.heading, ...next.bullets];
      } else if (result.length > 0) {
        result[result.length - 1].bullets.push(s.heading);
      }
      continue;
    }
    result.push(s);
  }
  return result;
}

// ── Title Filter ────────────────────────────────────────────────────────

/** Remove sections whose heading duplicates the sermon title; prepend orphaned bullets to next section. */
export function filterTitleFromSections(
  sections: PulpitSection[],
  title: string
): PulpitSection[] {
  const titleUpper = title.trim().toUpperCase();
  const result: PulpitSection[] = [];
  let orphanBullets: string[] = [];

  for (const s of sections) {
    if (s.heading && s.heading.trim().toUpperCase() === titleUpper) {
      orphanBullets.push(...s.bullets);
      continue;
    }
    if (orphanBullets.length > 0 && result.length === 0) {
      s.bullets = [...orphanBullets, ...s.bullets];
      orphanBullets = [];
    }
    result.push(s);
  }
  return result;
}

// ── Copyright ───────────────────────────────────────────────────────────

export const COPYRIGHT = () =>
  `© ${new Date().getFullYear()} The Island of One. All rights reserved. For personal use only.`;
