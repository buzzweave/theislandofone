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
  const collapsed = normalized.replace(/([^\n])\n([^\n])/g, "$1 $2");
  return collapsed
    .split(/\n{2,}/)
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
