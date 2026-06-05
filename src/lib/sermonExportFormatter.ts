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
  heading: string;          // title text only, e.g. "THE PROBLEM IS NOT THE WALL"
  summary: string;          // optional opening paragraph (rarely used)
  bullets: string[];        // up to 6 bullet points
  keyPoint: string[];       // KEY POINT paragraphs
  revelation: string[];     // REVELATION paragraphs
  quotable: string[];       // QUOTABLE italic lines
}

export interface ExportStructure {
  title: string;
  subtitle: string;         // optional subtitle (after ":" or "—")
  scriptureReference: string;
  scriptureText: string;
  illustration: string[];
  mainPoints: ExportMainPoint[];
  closing: string[];
}

// ── Roman numeral helper ────────────────────────────────────────────

export const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
  "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"];

export function toRoman(n: number): string {
  return ROMAN[n - 1] || String(n);
}

// Strip a leading roman/arabic numeral prefix like "I.", "II.", "1." from a heading
function stripNumeralPrefix(s: string): string {
  return s.replace(/^\s*(?:[IVXLCDM]+|\d+)[\.\)]\s+/i, "").trim();
}

function splitTitleSubtitle(full: string): { title: string; subtitle: string } {
  const m = full.split(/\s*[:\u2014\u2013\-]\s+/);
  if (m.length >= 2) return { title: m[0].trim(), subtitle: m.slice(1).join(" - ").trim() };
  return { title: full.trim(), subtitle: "" };
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
const SUB_LABEL_RE = /^(KEY\s*POINT|REVELATION|QUOTABLE|TEXT|APPLICATION|TAKEAWAY)\s*:?\s*$/i;

function detectSubLabel(line: string): "keyPoint" | "revelation" | "quotable" | null {
  const t = line.trim().replace(/[:\.]+$/, "").toUpperCase();
  if (t === "KEY POINT" || t === "KEYPOINT") return "keyPoint";
  if (t === "REVELATION") return "revelation";
  if (t === "QUOTABLE") return "quotable";
  return null;
}

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

    // Check for bold heading (main point) — but NOT sub-labels
    const isSubLabel = SUB_LABEL_RE.test(line.trim());
    const isBoldHeading = !isSubLabel && [...boldSegments].some(
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
  const ts = splitTitleSubtitle(title);
  const result: ExportStructure = {
    title: ts.title,
    subtitle: ts.subtitle,
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
  const illustrationLines = illustrationSections.flatMap(s => s.lines).filter(l => l.length > 0);

  // ── Pull scripture text OUT of illustration lines if parser missed it ──
  if (!result.scriptureText && scriptureNorm) {
    const refIdx = illustrationLines.findIndex(l =>
      l.toLowerCase().includes(scriptureNorm) ||
      l.toLowerCase().replace(/[–—-]/g, "-").includes(scriptureNorm.replace(/[–—-]/g, "-"))
    );
    if (refIdx !== -1) {
      const extracted: string[] = [];
      extracted.push(illustrationLines[refIdx]);
      let endIdx = refIdx + 1;
      while (endIdx < illustrationLines.length) {
        const nextLine = illustrationLines[endIdx];
        const looksLikeVerse = /^[""\u201C]/.test(nextLine) ||
          nextLine.toLowerCase().startsWith("but ") ||
          nextLine.toLowerCase().startsWith("and ") ||
          nextLine.toLowerCase().startsWith("for ") ||
          nextLine.toLowerCase().startsWith("then ") ||
          nextLine.endsWith('"') || nextLine.endsWith('\u201D') ||
          nextLine.endsWith('.\"') || nextLine.endsWith('."');
        const prevEndsOpen = extracted.length > 0 &&
          !extracted[extracted.length - 1].endsWith('.') &&
          !extracted[extracted.length - 1].endsWith('"') &&
          !extracted[extracted.length - 1].endsWith('\u201D');
        if (looksLikeVerse || prevEndsOpen) {
          extracted.push(nextLine);
          endIdx++;
        } else {
          break;
        }
      }
      result.scriptureText = extracted.join("\n\n");
      illustrationLines.splice(refIdx, extracted.length);
    }
  }

  result.illustration = illustrationLines;

  // Extract closing
  const closingSections = rawSections.filter(s => s.type === "closing");
  result.closing = closingSections.flatMap(s => s.lines).filter(l => l.length > 0);

  // ── Build main points with KEY POINT / REVELATION / QUOTABLE sub-blocks ──
  const mainPointSections = rawSections.filter(s => s.type === "mainpoint");

  const buildMainPoint = (heading: string, allLines: string[]): ExportMainPoint => {
    const bullets: string[] = [];
    const keyPoint: string[] = [];
    const revelation: string[] = [];
    const quotable: string[] = [];
    let bucket: "bullets" | "keyPoint" | "revelation" | "quotable" = "bullets";

    for (const raw of allLines) {
      const line = raw.trim();
      if (!line) continue;
      const sub = detectSubLabel(line);
      if (sub) { bucket = sub; continue; }

      if (bucket === "bullets") {
        // bullet item — strip prefix markers
        bullets.push(line.replace(/^[•●\-*]\s+/, "").trim());
      } else if (bucket === "keyPoint") {
        keyPoint.push(line);
      } else if (bucket === "revelation") {
        revelation.push(line);
      } else if (bucket === "quotable") {
        quotable.push(line.replace(/^[*_]+|[*_]+$/g, "").trim());
      }
    }

    return {
      heading: stripNumeralPrefix(heading),
      summary: "",
      bullets: bullets.slice(0, 6),
      keyPoint,
      revelation,
      quotable,
    };
  };

  if (mainPointSections.length > 0) {
    result.mainPoints = mainPointSections.map(mp => buildMainPoint(mp.heading, mp.lines));
  } else {
    const bodyLines = rawSections
      .filter(s => s.type === "body")
      .flatMap(s => s.lines)
      .filter(l => l.length > 0);

    if (bodyLines.length > 0) {
      const numPoints = Math.min(4, Math.max(1, Math.ceil(bodyLines.length / 7)));
      const chunkSize = Math.ceil(bodyLines.length / numPoints);

      for (let i = 0; i < numPoints; i++) {
        const chunk = bodyLines.slice(i * chunkSize, (i + 1) * chunkSize);
        result.mainPoints.push(buildMainPoint(`MAIN POINT ${toRoman(i + 1)}`, chunk));
      }
    }
  }

  return result;
}

/** @deprecated kept for backwards compatibility */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _ensureSixBullets(source: string[]): string[] {
  return source.slice(0, 6);
}
