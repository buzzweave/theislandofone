import React from "react";

/**
 * Parses raw sermon text (plain text or HTML) and renders it
 * with proper heading, bullet, and paragraph styling matching
 * the Island of One sermon manuscript look (Power of Transparency reference).
 *
 * Includes a pre-normalization pass that ensures proper line breaks
 * exist before section markers, so AI-generated content never renders
 * as one jumbled paragraph.
 */

// ── Detection helpers ──────────────────────────────────────────────

// Roman numeral main-point headings (I. II. III. IV. V. etc.)
const ROMAN_POINT_RE = /^(?:#{1,3}\s+)?(?:\*\*)?[IVXLCDM]+\.\s+/;

// Known section labels
const SECTION_LABELS = [
  "TRUE OPENING ILLUSTRATION",
  "OPENING ILLUSTRATION",
  "MID-SERMON ILLUSTRATION",
  "ILLUSTRATION CALLBACK",
  "ILLUSTRATION",
  "INTRODUCTION",
  "CLOSING BUILD",
  "CLOSING DECLARATION",
  "ALTAR CALL",
  "APPLICATION",
  "POWER DECLARATIONS",
  "POWER DECLARATION",
  "SCRIPTURE",
  "CONTINUED MAIN POINTS",
];

// Build a regex that matches any of those labels at start of line,
// optionally preceded by markdown heading markers or bold markers,
// and optionally followed by a colon
const SECTION_LABEL_RE = new RegExp(
  "^(?:#{1,3}\\s+)?(?:\\*\\*)?(?:" +
    SECTION_LABELS.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") +
    ")(?:\\*\\*)?\\s*:?\\s*$",
  "i"
);

// Matches "MAIN POINT 1", "MAIN POINT II" etc.
const MAIN_POINT_NUM_RE = /^(?:#{1,3}\s+)?(?:\*\*)?MAIN\s+POINT\s+[IVXLCDM0-9]+(?:\*\*)?/i;

// Prompt artifact prefixes to strip (e.g. "BOLD SECTION TITLE: TRUE OPENING ILLUSTRATION")
const ARTIFACT_PREFIX_RE =
  /^(?:BOLD\s+SECTION\s+TITLE|MAIN\s+POINT\s+TITLE(?:\s+IN\s+ALL\s+CAPS)?|SECTION\s+HEADING|SECTION\s+TITLE)\s*[:—–-]\s*/i;

function isRomanPointHeading(line: string): boolean {
  return ROMAN_POINT_RE.test(line.trim());
}

function isSectionLabel(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (SECTION_LABEL_RE.test(trimmed)) return true;
  if (MAIN_POINT_NUM_RE.test(trimmed)) return true;
  // All-caps lines > 4 chars that aren't bullets
  if (
    trimmed.length > 4 &&
    trimmed.length < 80 &&
    trimmed === trimmed.toUpperCase() &&
    /[A-Z]/.test(trimmed) &&
    !/^[•\-*●]/.test(trimmed) &&
    !/^KEY\s+POINT/i.test(trimmed)
  ) {
    return true;
  }
  return false;
}

function isKeyPointLine(line: string): boolean {
  return /^(?:\*\*)?KEY\s+POINT\s*[:—–-]/i.test(line.trim());
}

function isBulletLine(line: string): boolean {
  const t = line.trim();
  return /^[•●]\s/.test(t) || /^[-*]\s/.test(t);
}

function stripBulletPrefix(line: string): string {
  return line.trim().replace(/^[•\-*●]\s+/, "");
}

function stripHtml(html: string): string {
  let text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "");
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ");
  return text;
}

// ── Pre-normalization ──────────────────────────────────────────────
// Ensures proper line breaks exist before section markers so
// the line-by-line parser can detect them. Also strips prompt artifacts.

// Regex that matches inline section markers (headings jammed inside text)
// Uses a capture-group approach instead of lookbehind for broader browser support
const INLINE_SECTION_RE = new RegExp(
  "([.!?…\"')\\w])[ \\t]+(" +
    // Roman numeral headings
    "(?:[IVXLCDM]+\\.\\s+[A-Z][A-Z ]{3,})" +
    "|" +
    // Known labels
    SECTION_LABELS.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") +
    "|" +
    // MAIN POINT N
    "MAIN\\s+POINT\\s+[IVXLCDM0-9]+" +
    "|" +
    // KEY POINT:
    "KEY\\s+POINT\\s*[:—–-]" +
    ")",
  "gi"
);

function preNormalize(raw: string): string {
  let text = raw;

  // 1. Strip markdown bold wrappers from headings: **HEADING** → HEADING
  text = text.replace(/\*\*([A-Z][A-Z .:'!?0-9\-—–]+)\*\*/g, "$1");

  // 2. Strip prompt artifact prefixes
  text = text.replace(new RegExp(ARTIFACT_PREFIX_RE.source, "gim"), "");

  // 3. Insert line breaks before inline section markers
  // This is the KEY fix: if "...some text TRUE OPENING ILLUSTRATION ..."
  // we split it so the heading is on its own line.
  text = text.replace(INLINE_SECTION_RE, "$1\n\n$2");

  // 4. Also insert line breaks before Roman numeral headings that are inline
  text = text.replace(/([.!?…"')\s])(\s*)([IVXLCDM]+\.\s+[A-Z])/g, "$1\n\n$3");

  // 5. Insert line break before KEY POINT when inline
  text = text.replace(/([.!?…"')\s])\s*(KEY\s+POINT\s*[:—–-])/gi, "$1\n\n$2");

  // 6. Insert line break before bullet characters that are inline
  text = text.replace(/([.!?…"')\s])\s*([•●]\s)/g, "$1\n$2");

  // 7. Normalize multiple blank lines to max 2
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}

// ── Component ──────────────────────────────────────────────────────

interface SermonManuscriptRendererProps {
  content: string;
  title?: string;
  scripture?: string;
}

export const SermonManuscriptRenderer: React.FC<SermonManuscriptRendererProps> = ({
  content,
  title,
  scripture,
}) => {
  const isHtml = content.includes("<") && content.includes(">");
  const plainText = isHtml ? stripHtml(content) : content;
  const normalized = preNormalize(plainText);
  const rawLines = normalized.split("\n");

  const elements: React.ReactNode[] = [];
  let bulletBuffer: string[] = [];
  let key = 0;

  const flushBullets = () => {
    if (bulletBuffer.length === 0) return;
    elements.push(
      <ul key={key++} className="sms-bullets">
        {bulletBuffer.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
    );
    bulletBuffer = [];
  };

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushBullets();
      continue;
    }

    // Strip any remaining prompt artifact prefix on this line
    const cleaned = trimmed.replace(ARTIFACT_PREFIX_RE, "").trim();
    if (!cleaned) continue;

    if (isBulletLine(cleaned)) {
      bulletBuffer.push(stripBulletPrefix(cleaned));
      continue;
    }

    flushBullets();

    // Roman numeral main-point headings — dramatic large serif
    if (isRomanPointHeading(cleaned)) {
      elements.push(
        <h2 key={key++} className="sms-main-point">
          {cleaned}
        </h2>
      );
    }
    // KEY POINT label
    else if (isKeyPointLine(cleaned)) {
      const parts = cleaned.split(/[:—–-]\s*/);
      const label = parts[0]?.trim() || "KEY POINT";
      const rest = parts.slice(1).join(" ").trim();
      elements.push(
        <p key={key++} className="sms-key-point">
          <span className="sms-key-point-label">{label}:</span>{" "}
          {rest}
        </p>
      );
    }
    // Section labels (ILLUSTRATION, ALTAR CALL, etc.)
    else if (isSectionLabel(cleaned)) {
      elements.push(
        <h3 key={key++} className="sms-section-label">
          {cleaned}
        </h3>
      );
    }
    // Normal paragraph
    else {
      elements.push(
        <p key={key++} className="sms-paragraph">
          {cleaned}
        </p>
      );
    }
  }
  flushBullets();

  return (
    <>
      <style>{manuscriptCSS}</style>
      <article className="sermon-manuscript">
        {title && (
          <header className="sms-title-block">
            <h1 className="sms-title">{title}</h1>
            {scripture && <p className="sms-scripture">{scripture}</p>}
          </header>
        )}
        <div className="sms-body">{elements}</div>
      </article>
    </>
  );
};

/* ------------------------------------------------------------------ */
/*  CSS — locked to Power of Transparency reference                    */
/* ------------------------------------------------------------------ */
const manuscriptCSS = `
.sermon-manuscript {
  max-width: 720px;
  margin: 0 auto;
  padding: 0 1.25rem;
}

/* ---- Title block ---- */
.sms-title-block {
  text-align: center;
  margin-bottom: 2.5rem;
  padding-top: 0.5rem;
}
.sms-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 2.5rem;
  line-height: 1.08;
  font-weight: 800;
  color: hsl(var(--foreground));
  margin: 0 0 0.5rem 0;
}
.sms-scripture {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 1rem;
  opacity: 0.7;
  color: hsl(var(--foreground));
  margin: 0;
}

/* ---- MAIN POINT headings (Roman numeral) — dramatic large serif ---- */
.sms-main-point {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 1.75rem;
  line-height: 1.18;
  font-weight: 800;
  color: hsl(var(--foreground));
  margin: 2.75rem 0 1.25rem 0;
  text-transform: uppercase;
  letter-spacing: 0.01em;
}

/* ---- Section labels (ILLUSTRATION, ALTAR CALL, etc.) ---- */
.sms-section-label {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 1.35rem;
  line-height: 1.2;
  font-weight: 700;
  color: hsl(var(--foreground));
  margin: 2rem 0 0.85rem 0;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  opacity: 0.92;
}

/* ---- Body paragraphs ---- */
.sms-paragraph {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 1.125rem;
  line-height: 1.75;
  color: hsl(var(--foreground));
  margin: 0 0 1.1rem 0;
}

/* ---- Bullet lists ---- */
.sms-bullets {
  list-style: disc;
  padding-left: 1.75rem;
  margin: 0.75rem 0 1.5rem 0;
}
.sms-bullets li {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 1.125rem;
  line-height: 1.65;
  color: hsl(var(--foreground));
  margin: 0 0 0.85rem 0;
}

/* ---- KEY POINT ---- */
.sms-key-point {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 1.125rem;
  line-height: 1.65;
  color: hsl(var(--foreground));
  margin: 1.5rem 0 1.75rem 0;
  padding-left: 0.25rem;
}
.sms-key-point-label {
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: hsl(var(--primary));
}

/* ---- Mobile refinements ---- */
@media (max-width: 640px) {
  .sms-title {
    font-size: 1.85rem;
  }
  .sms-main-point {
    font-size: 1.45rem;
  }
  .sms-section-label {
    font-size: 1.15rem;
  }
}
`;

export default SermonManuscriptRenderer;
