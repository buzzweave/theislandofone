import DOMPurify from "dompurify";

export function fixPunctuation(text: string): string {
  let fixed = text.replace(/([.!?])([A-Za-z])/g, "$1 $2");
  fixed = fixed.replace(/,([A-Za-z])/g, ", $1");
  fixed = fixed.replace(/ {2,}/g, " ");
  return fixed;
}

export function extractParagraphs(content: string): string[] {
  const isHtml = content?.includes("<") && content?.includes(">");

  if (isHtml) {
    const clean = DOMPurify.sanitize(content, {
      ALLOWED_TAGS: ["p", "br", "span", "strong", "em", "b", "i"],
    });
    const doc = new DOMParser().parseFromString(clean, "text/html");
    const pElements = Array.from(doc.querySelectorAll("p"));

    if (pElements.length > 0) {
      const paragraphs: string[] = [];
      let current = "";

      for (const p of pElements) {
        const text = (p.textContent || "").trim();
        if (text.length === 0) {
          if (current.length > 0) {
            paragraphs.push(fixPunctuation(current));
            current = "";
          }
        } else {
          current = current ? current + " " + text : text;
        }
      }
      if (current.length > 0) {
        paragraphs.push(fixPunctuation(current));
      }

      return paragraphs;
    }

    const plainText = doc.body.textContent || "";
    return formatPlainText(plainText);
  }

  return formatPlainText(content);
}

export function formatPlainText(rawText: string): string[] {
  const cleaned = fixPunctuation(rawText);
  const normalized = cleaned.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  let paragraphs = normalized.split(/\n{2,}/);

  if (paragraphs.length <= 1) {
    paragraphs = normalized.split(/\n/);
  }

  if (paragraphs.length <= 1 && normalized.length > 500) {
    const sentences = normalized.match(/[^.!?]*[.!?]+\s*/g) || [normalized];
    paragraphs = [];
    let current = "";
    for (let i = 0; i < sentences.length; i++) {
      current += sentences[i];
      if ((i + 1) % 3 === 0 || i === sentences.length - 1) {
        paragraphs.push(current.trim());
        current = "";
      }
    }
  }

  return paragraphs.map((p) => p.trim()).filter((p) => p.length > 0);
}
