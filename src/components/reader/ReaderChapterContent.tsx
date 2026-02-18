import { BookParagraph } from "./BookParagraph";
import { ChapterHeader } from "./ChapterHeader";
import DOMPurify from "dompurify";

interface ReaderChapterContentProps {
  title: string;
  content: string;
  chapterNumber?: number;
  isPreface?: boolean;
}

function formatManuscriptText(rawText: string): string[] {
  const normalized = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  
  // Split on double newlines (true paragraph breaks)
  let paragraphs = normalized.split(/\n{2,}/);
  
  // If no double-newline breaks found, try splitting on single newlines
  if (paragraphs.length <= 1) {
    paragraphs = normalized.split(/\n/);
  }
  
  // If still one big block, split on sentence-ending patterns followed by a capital letter
  // This catches content pasted without any line breaks
  if (paragraphs.length <= 1 && normalized.length > 600) {
    paragraphs = normalized.split(/(?<=[.!?])\s{2,}(?=[A-Z])/);
  }
  
  // If still one block and very long, split roughly every 3-5 sentences
  if (paragraphs.length <= 1 && normalized.length > 800) {
    const sentences = normalized.match(/[^.!?]+[.!?]+\s*/g) || [normalized];
    paragraphs = [];
    let current = "";
    for (let i = 0; i < sentences.length; i++) {
      current += sentences[i];
      if ((i + 1) % 4 === 0 || i === sentences.length - 1) {
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
