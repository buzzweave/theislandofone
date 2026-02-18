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
  // Ensure space after period, exclamation, question mark when followed by a letter
  let fixed = text.replace(/([.!?])([A-Za-z])/g, "$1 $2");
  // Ensure space after comma when followed by a letter (not inside numbers)
  fixed = fixed.replace(/,([A-Za-z])/g, ", $1");
  // Collapse multiple spaces into one
  fixed = fixed.replace(/ {2,}/g, " ");
  return fixed;
}

function formatManuscriptText(rawText: string): string[] {
  // Fix punctuation spacing first
  const cleaned = fixPunctuation(rawText);
  const normalized = cleaned.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  
  // Split on double newlines (true paragraph breaks)
  let paragraphs = normalized.split(/\n{2,}/);
  
  // If no double-newline breaks found, try splitting on single newlines
  if (paragraphs.length <= 1) {
    paragraphs = normalized.split(/\n/);
  }
  
  // If still one big block, split on sentence boundaries where a new thought begins
  if (paragraphs.length <= 1 && normalized.length > 500) {
    const sentences = normalized.match(/[^.!?]*[.!?]+\s*/g) || [normalized];
    paragraphs = [];
    let current = "";
    for (let i = 0; i < sentences.length; i++) {
      current += sentences[i];
      // Group ~3-4 sentences per paragraph for natural book flow
      if ((i + 1) % 3 === 0 || i === sentences.length - 1) {
        paragraphs.push(current.trim());
        current = "";
      }
    }
  }
  
  return paragraphs
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

function stripHtml(html: string): string {
  const clean = DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
  const doc = new DOMParser().parseFromString(clean, "text/html");
  return doc.body.textContent || "";
}

export const ReaderChapterContent = ({
  title,
  content,
  chapterNumber,
  isPreface = false,
}: ReaderChapterContentProps) => {
  const isHtml = content?.includes("<") && content?.includes(">");
  const plainText = isHtml ? stripHtml(content) : content;
  const paragraphs = formatManuscriptText(plainText);

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
