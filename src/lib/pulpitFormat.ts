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

export const MIN_BULLETS_PER_PAGE = 5;
export const MAX_BULLETS_PER_PAGE = 8;

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

// ── Heading Detection ───────────────────────────────────────────────────

const ROMAN = /^(I{1,3}|IV|V|VI{0,3}|IX|X{1,3}|XL|L)[\.\)\s—–\-:]/i;
const NUMBERED = /^\d{1,2}[\.\)\s—–\-:]/;
const MAIN_POINT_KW = /main\s*point/i;

function isHeading(line: string): boolean {
  const t = line.trim();
  if (t.length === 0 || t.length > 150) return false;
  if (MAIN_POINT_KW.test(t)) return true;
  if (ROMAN.test(t)) return true;
  if (NUMBERED.test(t) && t === t.toUpperCase()) return true;
  if (t === t.toUpperCase() && t.length > 3 && t.length < 150) return true;
  if (t.endsWith(":") && t.length < 100) return true;
  return false;
}

// ── Bullet Splitting ────────────────────────────────────────────────────

/** Ensure each bullet is at most ~2 sentences. */
function splitLongBullet(text: string): string[] {
  // Split on sentence boundaries
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
  const raw = manuscript.includes("<") ? stripHtml(manuscript) : manuscript;
  const lines = raw.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

  const sections: PulpitSection[] = [];
  let current: PulpitSection | null = null;

  for (const line of lines) {
    if (isHeading(line)) {
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

// ── Copyright ───────────────────────────────────────────────────────────

export const COPYRIGHT = () =>
  `© ${new Date().getFullYear()} The Island of One. All rights reserved. For personal use only.`;
