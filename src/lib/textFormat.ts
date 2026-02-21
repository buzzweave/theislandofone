import DOMPurify from "dompurify";

export function fixPunctuation(text: string): string {
  let fixed = text.replace(/([.!?])([A-Za-z])/g, "$1 $2");
  fixed = fixed.replace(/,([A-Za-z])/g, ", $1");
  fixed = fixed.replace(/ {2,}/g, " ");
  return fixed;
}

function groupSentences(text: string, perGroup: number = 4): string[] {
  const sentences = text.match(/[^.!?]*[.!?]+\s*/g);
  if (!sentences) return [text];
  const result: string[] = [];
  let current = "";
  for (let i = 0; i < sentences.length; i++) {
    current += sentences[i];
    if ((i + 1) % perGroup === 0 || i === sentences.length - 1) {
      result.push(current.trim());
      current = "";
    }
  }
  return result.filter((p) => p.length > 0);
}

function smartGroup(units: string[]): string[] {
  if (units.length === 0) return [];
  if (units.length === 1) {
    // Single block — split by sentences if long
    if (units[0].length > 300) {
      return groupSentences(units[0], 4);
    }
    return units;
  }

  const avgLen = units.reduce((s, u) => s + u.length, 0) / units.length;

  // If average unit is short (single-sentence lines), merge into proper paragraphs
  if (avgLen < 80) {
    const joined = units.join(" ");
    return groupSentences(joined, 4);
  }

  // Units are already substantial — author intended those breaks
  return units;
}

/**
 * Extract paragraphs from content.
 * @param content  The raw HTML or plain text
 * @param raw      If true, preserve every line break as-is (SERMON FLOW mode).
 *                 No smart-grouping or sentence merging will be applied.
 */
export function extractParagraphs(content: string, raw = false): string[] {
  const isHtml = content?.includes("<") && content?.includes(">");

  if (isHtml) {
    const clean = DOMPurify.sanitize(content, {
      ALLOWED_TAGS: ["p", "br", "span", "strong", "em", "b", "i"],
    });
    const doc = new DOMParser().parseFromString(clean, "text/html");
    const pElements = Array.from(doc.querySelectorAll("p"));

    if (pElements.length > 0) {
      const units = pElements
        .map((p) => (p.textContent || "").trim())
        .filter((t) => t.length > 0);

      if (raw) return units.map(fixPunctuation);
      return smartGroup(units).map(fixPunctuation);
    }

    const plainText = doc.body.textContent || "";
    return formatPlainText(plainText, raw);
  }

  return formatPlainText(content, raw);
}

export function formatPlainText(rawText: string, raw = false): string[] {
  const cleaned = fixPunctuation(rawText);
  const normalized = cleaned.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  if (raw) {
    // SERMON FLOW: preserve every single line break as its own paragraph
    return normalized.split(/\n/).map((p) => p.trim()).filter((p) => p.length > 0).map(fixPunctuation);
  }

  let paragraphs = normalized.split(/\n{2,}/);

  if (paragraphs.length <= 1) {
    paragraphs = normalized.split(/\n/);
  }

  const units = paragraphs.map((p) => p.trim()).filter((p) => p.length > 0);
  return smartGroup(units).map(fixPunctuation);
}
