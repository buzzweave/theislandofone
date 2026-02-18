import { cn } from "@/lib/utils";

interface BookParagraphProps {
  text: string;
  isFirst?: boolean;
  withDropCap?: boolean;
}

export const BookParagraph = ({ text, isFirst = false, withDropCap = false }: BookParagraphProps) => (
  <p className={cn(withDropCap && "reader-drop-cap", isFirst && !withDropCap && "reader-first-paragraph")}>
    {text}
  </p>
);
