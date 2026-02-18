import { BookParagraph } from "./BookParagraph";
import { ChapterHeader } from "./ChapterHeader";
import DOMPurify from "dompurify";

interface ReaderChapterContentProps {
  title: string;
  content: string;
  chapterNumber?: number;
  isPreface?: boolean;
}

function fixPunctuation(text: string): string {
  let fixed = text.replace(/([.!?])([A-Za-z])/g, "$1 $2");
  fixed = fixed.replace(/,([A-Za-z])/g, ", $1");
  fixed = fixed.replace(/ {2,}/g, " ");
  return fixed;
}
// Merge short fragments (< ~80 chars) into the previous paragraph
function mergeShortParagraphs(paragraphs: string[]): string[] {
  if (paragraphs.length <= 1) return paragraphs;
  
  const merged: string[] = [];
  for (let i = 0; i < paragraphs.length; i++) {
    const text = paragraphs[i];
    // If this paragraph is short and there's a previous one, append to it
    if (text.length < 80 && merged.length > 0) {
      merged[merged.length - 1] += " " + text;
    } else {
      merged.push(text);
    }
  }
  return merged;
}

function extractParagraphs(content: string): string[] {
  const isHtml = content?.includes("<") && content?.includes(">");
  
  if (isHtml) {
    // Parse HTML and extract text from each <p> tag as a separate paragraph
    const clean = DOMPurify.sanitize(content, { ALLOWED_TAGS: ["p", "br", "span", "strong", "em", "b", "i"] });
    const doc = new DOMParser().parseFromString(clean, "text/html");
    const pElements = doc.querySelectorAll("p");
    
    if (pElements.length > 0) {
      const rawParagraphs: string[] = [];
      pElements.forEach((p) => {
        const text = (p.textContent || "").trim();
        if (text.length > 0) {
          rawParagraphs.push(fixPunctuation(text));
        }
      });
      return mergeShortParagraphs(rawParagraphs);
    }
    
    // Fallback: no <p> tags, get all text
    const plainText = doc.body.textContent || "";
    return formatPlainText(plainText);
  }
  
  return formatPlainText(content);
}

function formatPlainText(rawText: string): string[] {
  const cleaned = fixPunctuation(rawText);
  const normalized = cleaned.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  
  // Split on double newlines first
  let paragraphs = normalized.split(/\n{2,}/);
  
  // If only one block, try single newlines
  if (paragraphs.length <= 1) {
    paragraphs = normalized.split(/\n/);
  }
  
  // If still one big block, split every ~3 sentences
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

export const ReaderChapterContent = ({
  title,
  content,
  chapterNumber,
  isPreface = false,
}: ReaderChapterContentProps) => {
  let paragraphs = extractParagraphs(content || "");
  
  // Skip first paragraph if it just repeats the chapter title (e.g. "Introduction", "Dedication")
  if (paragraphs.length > 1) {
    const first = paragraphs[0].toLowerCase().replace(/[^a-z]/g, "");
    const chTitle = title.toLowerCase().replace(/[^a-z]/g, "");
    if (first === chTitle || first.length <= 2) {
      paragraphs = paragraphs.slice(1);
    }
  }

  return (
    <article className="book-reader-page">
      <ChapterHeader number={chapterNumber} title={title} isPreface={isPreface} />
      <div className="book-reader-prose mx-auto max-w-[720px] px-6 md:px-8">
        {paragraphs.map((text, index) => (
          <BookParagraph key={index} text={text} isFirst={index === 0} withDropCap={index === 0} />
        ))}
      </div>
    </article>
  );
};
