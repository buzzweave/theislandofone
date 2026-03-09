import React from "react";

/**
 * Parses raw sermon text (plain text or HTML) and renders it
 * with proper heading, bullet, and paragraph styling matching
 * the Island of One sermon manuscript look.
 */

// Detect lines that are sermon section headings
const HEADING_RE =
  /^(?:#{1,3}\s+)?(?:[IVXLCDM]+\.\s+|MAIN\s+POINT\s+[IVXLCDM0-9]+|CLOSING\s+BUILD|ALTAR\s+CALL|ILLUSTRATION|INTRODUCTION|KEY\s+POINT|APPLICATION|POWER\s+DECLARATIONS?|CLOSING\s+DECLARATION|SCRIPTURE|OPENING\s+ILLUSTRATION)/i;

const ROMAN_HEADING_RE = /^[IVXLCDM]+\.\s+/;

function isHeadingLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (HEADING_RE.test(trimmed)) return true;
  // All-caps lines longer than 4 chars that aren't bullets
  if (
    trimmed.length > 4 &&
    trimmed === trimmed.toUpperCase() &&
    /[A-Z]/.test(trimmed) &&
    !trimmed.startsWith("•") &&
    !trimmed.startsWith("-") &&
    !trimmed.startsWith("*")
  ) {
    return true;
  }
  return false;
}

function isBulletLine(line: string): boolean {
  const t = line.trim();
  return t.startsWith("• ") || t.startsWith("- ") || t.startsWith("* ") || t.startsWith("● ");
}

function stripBulletPrefix(line: string): string {
  return line.trim().replace(/^[•\-*●]\s+/, "");
}

function stripHtml(html: string): string {
  // Convert <br> variants to newlines, strip tags, decode entities
  let text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "");
  // Decode common entities
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
  // Convert HTML to plain text if needed
  const isHtml = content.includes("<") && content.includes(">");
  const plainText = isHtml ? stripHtml(content) : content;

  // Split into lines
  const rawLines = plainText.split("\n");

  // Build elements
  const elements: React.ReactNode[] = [];
  let bulletBuffer: string[] = [];
  let key = 0;

  const flushBullets = () => {
    if (bulletBuffer.length === 0) return;
    elements.push(
      <ul key={key++} className="sermon-ms-bullets">
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

    // Skip empty lines (spacing handled by CSS)
    if (!trimmed) {
      flushBullets();
      continue;
    }

    if (isBulletLine(trimmed)) {
      bulletBuffer.push(stripBulletPrefix(trimmed));
      continue;
    }

    flushBullets();

    if (isHeadingLine(trimmed)) {
      elements.push(
        <h2 key={key++} className="sermon-ms-heading">
          {trimmed}
        </h2>
      );
    } else {
      elements.push(
        <p key={key++} className="sermon-ms-paragraph">
          {trimmed}
        </p>
      );
    }
  }
  flushBullets();

  return (
    <>
      <style>{sermonManuscriptStyles}</style>
      <article className="sermon-manuscript">
        {title && (
          <header className="sermon-ms-title-block">
            <h1 className="sermon-ms-title">{title}</h1>
            {scripture && <p className="sermon-ms-scripture">{scripture}</p>}
          </header>
        )}
        <div className="sermon-ms-body">{elements}</div>
      </article>
    </>
  );
};

const sermonManuscriptStyles = `
.sermon-manuscript {
  max-width: 720px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

.sermon-ms-title-block {
  text-align: center;
  margin-bottom: 2.5rem;
  padding-top: 0.5rem;
}

.sermon-ms-title {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 2.25rem;
  line-height: 1.1;
  font-weight: 700;
  color: hsl(0 0% 100%);
  margin: 0 0 0.5rem 0;
}

.sermon-ms-scripture {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 1rem;
  opacity: 0.75;
  color: hsl(0 0% 100%);
  margin: 0;
}

.sermon-ms-heading {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 1.55rem;
  line-height: 1.2;
  font-weight: 700;
  color: hsl(0 0% 100%);
  margin: 2.25rem 0 1rem 0;
  text-transform: uppercase;
  letter-spacing: 0.01em;
}

.sermon-ms-paragraph {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 1.125rem;
  line-height: 1.7;
  color: hsl(0 0% 100%);
  margin: 0 0 1rem 0;
}

.sermon-ms-bullets {
  list-style: disc;
  padding-left: 1.75rem;
  margin: 0.75rem 0 1.25rem 0;
}

.sermon-ms-bullets li {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 1.125rem;
  line-height: 1.6;
  color: hsl(0 0% 100%);
  margin: 0 0 0.75rem 0;
}

@media (max-width: 640px) {
  .sermon-ms-title {
    font-size: 1.75rem;
  }
  .sermon-ms-heading {
    font-size: 1.35rem;
  }
}
`;

export default SermonManuscriptRenderer;
