/**
 * SERMON EXPORT FORMATTER
 *
 * Parses sermon manuscripts into a strict section-per-page structure
 * for PDF, GoodNotes, and Word exports ONLY.
 *
 * This does NOT affect the live sermon layout on theislandofone.com.
 *
 * Page structure:
 *   1. TITLE PAGE — sermon title only
 *   2. SCRIPTURE PAGE — header + reference + full text
 *   3. ILLUSTRATION PAGE — header + readable paragraphs
 *   4. MAIN POINT I/II/III/IV… — each on its own page
 *      - heading (bold uppercase Playfair Display)
 *      - one short summary paragraph
 *      - exactly six bullet points
 *   5. CLOSING PAGE — header + readable paragraphs
 *
 * NO section may carry over from a previous page.
 * If bold headings are not detected, automatic numbering is applied.
 */

// ── Types ────────────────────────────────────────────────────────────

export interface ExportMainPoint {
  heading: string;          // e.g. "MAIN POINT I"
  summary: string;          // one short paragraph
  bullets: string[];        // exactly 6 bullet points
}

export interface ExportStructure {
  title: string;
  scriptureReference: string;
  scriptureText: string;    // full scripture body if available
  illustration: string[];   // paragraphs
  mainPoints: ExportMainPoint[];
  closing: string[];        // paragraphs
}

// ── Roman numeral helper ────────────────────────────────────────────

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
  "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"];

function toRoman(n: number): string {
  return ROMAN[n - 1] || String(n);
}

// ── HTML helpers ────────────────────────────────────────────────────

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

function extractBoldSegments(html: string): Set<string> {
  const bolds = new Set<string>();
  const re = /<(?:strong|b)(?:\s[^>]*)?>(.+?)<\/(?:strong|b)>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const text = m[1]
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
      .trim();
    if (text.length > 0) bolds.add(text);
  }
  return bolds;
}

// ── Section label detection ─────────────────────────────────────────

const ILLUSTRATION_RE = /^(?:TRUE\s+)?(?:OPENING\s+)?ILLUSTRATION|^MID[- ]SERMON\s+ILLUSTRATION|^ILLUSTRATION\s*(?:CALLBACK)?/i;
const CLOSING_RE = /^CLOSING(?:\s+(?:BUILD|DECLARATION|THOUGHTS?))?|^ALTAR\s+CALL/i;
const SCRIPTURE_RE = /^SCRIPTURE\s*(?:REFERENCE)?/i;
const INTRO_RE = /^INTRODUCTION/i;
const MAIN_POINT_LABEL_RE = /^MAIN\s+POINT\s+([IVXLCDM0-9]+)/i;

function detectSectionType(line: string): "illustration" | "closing" | "scripture" | "intro" | "mainpoint" | null {
  const t = line.trim();
  if (ILLUSTRATION_RE.test(t)) return "illustration";
  if (CLOSING_RE.test(t)) return "closing";
  if (SCRIPTURE_RE.test(t)) return "scripture";
  if (INTRO_RE.test(t)) return "intro";
  if (MAIN_POINT_LABEL_RE.test(t)) return "mainpoint";
  return null;
}

// ── Main parser ─────────────────────────────────────────────────────

export function parseExportStructure(
  manuscript: string,
  title: string,
  scriptureReference: string,
): ExportStructure {
  const boldSegments = manuscript.includes("<") ? extractBoldSegments(manuscript) : new Set<string>();
  const raw = manuscript.includes("<") ? stripHtml(manuscript) : manuscript;
  const lines = raw.split("\n").map(l => l.trim()).filter(l => l.length > 0);

  const titleNorm = title.trim().toLowerCase();
  const scriptureNorm = scriptureReference?.trim().toLowerCase() || "";

  // Collect raw sections
  interface RawSection {
    type: "illustration" | "closing" | "scripture" | "intro" | "mainpoint" | "body";
    heading: string;
    lines: string[];
  }

  const rawSections: RawSection[] = [];
  let current: RawSection | null = null;

  for (const line of lines) {
    const lineNorm = line.toLowerCase();
    // Skip lines matching title or scripture reference
    if (lineNorm === titleNorm || (scriptureNorm && lineNorm === scriptureNorm)) continue;

    // Check for section label
    const sectionType = detectSectionType(line);
    if (sectionType) {
      current = { type: sectionType, heading: line, lines: [] };
      rawSections.push(current);
      continue;
    }

    // Check for bold heading (main point)
    const isBoldHeading = [...boldSegments].some(
      b => b.toLowerCase() === lineNorm || lineNorm.startsWith(b.toLowerCase())
    );

    if (isBoldHeading && line.length < 120) {
      current = { type: "mainpoint", heading: line, lines: [] };
      rawSections.push(current);
      continue;
    }

    // Append to current section or create body
    if (current) {
      current.lines.push(line);
    } else {
      // Pre-heading content goes to illustration/intro
      if (!rawSections.length || rawSections[rawSections.length - 1].type !== "body") {
        current = { type: "body", heading: "", lines: [line] };
        rawSections.push(current);
      } else {
        rawSections[rawSections.length - 1].lines.push(line);
        current = rawSections[rawSections.length - 1];
      }
    }
  }

  // Build ExportStructure
  const result: ExportStructure = {
    title,
    scriptureReference,
    scriptureText: "",
    illustration: [],
    mainPoints: [],
    closing: [],
  };

  // Extract scripture text from scripture sections
  const scriptureSections = rawSections.filter(s => s.type === "scripture");
  if (scriptureSections.length > 0) {
    result.scriptureText = scriptureSections.flatMap(s => s.lines).join("\n\n");
  }

  // Extract illustration text
  const illustrationSections = rawSections.filter(s => s.type === "illustration" || s.type === "intro" || s.type === "body");
  result.illustration = illustrationSections.flatMap(s => s.lines).filter(l => l.length > 0);

  // Extract closing
  const closingSections = rawSections.filter(s => s.type === "closing");
  result.closing = closingSections.flatMap(s => s.lines).filter(l => l.length > 0);

  // Extract main points
  const mainPointSections = rawSections.filter(s => s.type === "mainpoint");

  if (mainPointSections.length > 0) {
    // Use detected main points
    result.mainPoints = mainPointSections.map((mp, idx) => {
      const allLines = mp.lines;
      // First substantial line is summary, rest become bullets
      const summary = allLines[0] || mp.heading;
      const bulletSource = allLines.slice(summary === mp.heading ? 0 : 1);

      // Ensure exactly 6 bullets
      const bullets = ensureSixBullets(bulletSource);

      return {
        heading: `MAIN POINT ${toRoman(idx + 1)}`,
        summary: summary === mp.heading ? "" : summary,
        bullets,
      };
    });
  } else {
    // No bold headings detected — auto-create from body content
    // Group all non-illustration, non-closing, non-scripture lines
    const bodyLines = rawSections
      .filter(s => s.type === "body")
      .flatMap(s => s.lines)
      .filter(l => l.length > 0);

    if (bodyLines.length > 0) {
      // Split into ~4 equal groups for main points
      const numPoints = Math.min(4, Math.max(1, Math.ceil(bodyLines.length / 7)));
      const chunkSize = Math.ceil(bodyLines.length / numPoints);

      for (let i = 0; i < numPoints; i++) {
        const chunk = bodyLines.slice(i * chunkSize, (i + 1) * chunkSize);
        const summary = chunk[0] || "";
        const bulletSource = chunk.slice(1);

        result.mainPoints.push({
          heading: `MAIN POINT ${toRoman(i + 1)}`,
          summary,
          bullets: ensureSixBullets(bulletSource),
        });
      }
    }
  }

  return result;
}

/** Ensure exactly 6 bullet points. Pad with empty or trim excess. */
function ensureSixBullets(source: string[]): string[] {
  // Clean bullet prefixes
  const cleaned = source.map(l => l.replace(/^[•●\-*]\s+/, "").trim()).filter(l => l.length > 0);

  if (cleaned.length >= 6) {
    return cleaned.slice(0, 6);
  }

  // If fewer than 6, try splitting longer sentences
  const expanded: string[] = [];
  for (const line of cleaned) {
    if (expanded.length >= 6) break;
    const sentences = line.match(/[^.!?]+[.!?]+/g);
    if (sentences && sentences.length > 1 && expanded.length + sentences.length <= 8) {
      for (const s of sentences) {
        if (expanded.length >= 6) break;
        expanded.push(s.trim());
      }
    } else {
      expanded.push(line);
    }
  }

  // Pad remaining with empty strings
  while (expanded.length < 6) {
    expanded.push("");
  }

  return expanded.slice(0, 6);
}
