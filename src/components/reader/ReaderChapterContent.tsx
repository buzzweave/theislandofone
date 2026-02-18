import { BookParagraph } from "./BookParagraph";
import { ChapterHeader } from "./ChapterHeader";
import { extractParagraphs } from "@/lib/textFormat";

interface ReaderChapterContentProps {
  title: string;
  content: string;
  chapterNumber?: number;
  isPreface?: boolean;
}

export const ReaderChapterContent = ({
  title,
  content,
  chapterNumber,
  isPreface = false,
}: ReaderChapterContentProps) => {
  let paragraphs = extractParagraphs(content || "");
  
  // Skip first paragraph if it just repeats the chapter title
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
