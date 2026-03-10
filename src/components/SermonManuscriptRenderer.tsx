import React from "react";

/**
 * Parses raw sermon text (plain text or HTML) and renders it
 * with proper heading, bullet, and paragraph styling matching
 * the Island of One sermon manuscript look (Power of Transparency reference).
 */

// Detect Roman numeral main-point headings (I. II. III. etc)
const ROMAN_POINT_RE = /^(?:#{1,3}\s+)?[IVXLCDM]+\.\s+/;

// Detect other section labels
const SECTION_LABEL_RE =
  /^(?:#{1,3}\s+)?(?:MAIN\s+POINT\s+[IVXLCDM0-9]+|CLOSING\s+BUILD|ALTAR\s+CALL|(?:TRUE\s+)?(?:OPENING\s+)?ILLUSTRATION|MID[- ]SERMON\s+ILLUSTRATION|INTRODUCTION|KEY\s+POINT|APPLICATION|POWER\s+DECLARATIONS?|CLOSING\s+DECLARATION|SCRIPTURE|OPENING\s+ILLUSTRATION)/i;

function isRomanPointHeading(line: string): boolean {
  return ROMAN_POINT_RE.test(line.trim());
}

function isSectionLabel(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (SECTION_LABEL_RE.test(trimmed)) return true;
  // All-caps lines longer than 4 chars that aren't bullets or KEY POINT
  if (
    trimmed.length > 4 &&
    trimmed === trimmed.toUpperCase() &&
    /[A-Z]/.test(trimmed) &&
    !trimmed.startsWith("•") &&
    !trimmed.startsWith("-") &&
    !trimmed.startsWith("*") &&
    !trimmed.startsWith("KEY POINT")
  ) {
    return true;
  }
  return false;
}

function isKeyPointLine(line: string): boolean {
  return /^KEY\s+POINT\s*[:—–-]/i.test(line.trim());
}

function isBulletLine(line: string): boolean {
  const t = line.trim();
  return t.startsWith("• ") || t.startsWith("- ") || t.startsWith("* ") || t.startsWith("● ");
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
  const rawLines = plainText.split("\n");

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

    if (isBulletLine(trimmed)) {
      bulletBuffer.push(stripBulletPrefix(trimmed));
      continue;
    }

    flushBullets();

    // Roman numeral main-point headings — dramatic large serif
    if (isRomanPointHeading(trimmed)) {
      elements.push(
        <h2 key={key++} className="sms-main-point">
          {trimmed}
        </h2>
      );
    }
    // KEY POINT label
    else if (isKeyPointLine(trimmed)) {
      const parts = trimmed.split(/[:—–-]\s*/);
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
    else if (isSectionLabel(trimmed)) {
      elements.push(
        <h3 key={key++} className="sms-section-label">
          {trimmed}
        </h3>
      );
    }
    // Normal paragraph
    else {
      elements.push(
        <p key={key++} className="sms-paragraph">
          {trimmed}
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
