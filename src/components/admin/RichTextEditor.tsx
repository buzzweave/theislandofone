import { useEditor, EditorContent, type Editor, Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Slice, Fragment } from "@tiptap/pm/model";
import { useEffect, useCallback } from "react";

/**
 * Custom extension that converts pasted plain text into proper paragraph nodes
 * instead of TipTap's default behaviour of using <br> for every newline.
 * Double-newlines become paragraph breaks; single newlines become hard breaks.
 */
const PasteAsParas = Extension.create({
  name: "pasteAsParas",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("pasteAsParas"),
        props: {
          handlePaste(view, event) {
            const html = event.clipboardData?.getData("text/html");
            const text = event.clipboardData?.getData("text/plain");

            // If HTML is present (e.g. from ChatGPT), normalize it to preserve paragraphs
            if (html) {
              // Create a temp element to parse the HTML
              const div = document.createElement("div");
              div.innerHTML = html;

              // Remove any wrapper divs/spans that ChatGPT adds, keep paragraph structure
              // Convert <br><br> sequences into paragraph breaks
              let cleaned = div.innerHTML;
              // Replace double <br> with paragraph split marker
              cleaned = cleaned.replace(/(<br\s*\/?>\s*){2,}/gi, "</p><p>");
              // Wrap content in <p> if it's not already wrapped
              if (!cleaned.trim().startsWith("<p") && !cleaned.trim().startsWith("<h")) {
                cleaned = `<p>${cleaned}</p>`;
              }

              // Parse the cleaned HTML into ProseMirror nodes
              const tempDiv = document.createElement("div");
              tempDiv.innerHTML = cleaned;
              const { schema } = view.state;
              const nodes: any[] = [];

              tempDiv.childNodes.forEach((node) => {
                if (node.nodeType === Node.TEXT_NODE) {
                  const t = node.textContent?.trim();
                  if (t) nodes.push(schema.nodes.paragraph.create(null, schema.text(t)));
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                  const el = node as HTMLElement;
                  const tag = el.tagName.toLowerCase();

                  if (tag === "p" || tag === "div") {
                    const inner = el.innerHTML.trim();
                    if (!inner) return;
                    // Parse inline content (bold, italic, etc.) by using the editor's parser
                    const wrapper = document.createElement("div");
                    wrapper.innerHTML = `<p>${inner}</p>`;
                    const parsed = view.state.schema.nodeFromJSON(
                      // Use DOMParser to properly parse inline marks
                      view.someProp("domParser" as any, () => null)
                        ? null
                        : null
                    );
                    // Fallback: just use plain text from the element
                    const textContent = el.textContent?.trim();
                    if (textContent) {
                      nodes.push(schema.nodes.paragraph.create(null, schema.text(textContent)));
                    }
                  } else if (tag === "h1" || tag === "h2" || tag === "h3") {
                    const level = parseInt(tag.charAt(1));
                    const textContent = el.textContent?.trim();
                    if (textContent && schema.nodes.heading) {
                      nodes.push(schema.nodes.heading.create({ level }, schema.text(textContent)));
                    }
                  } else if (tag === "strong" || tag === "b" || tag === "em" || tag === "i") {
                    const textContent = el.textContent?.trim();
                    if (textContent) {
                      const marks: any[] = [];
                      if (tag === "strong" || tag === "b") marks.push(schema.marks.bold.create());
                      if (tag === "em" || tag === "i") marks.push(schema.marks.italic.create());
                      nodes.push(schema.nodes.paragraph.create(null, schema.text(textContent, marks)));
                    }
                  } else {
                    // Generic fallback: extract text as paragraph
                    const textContent = el.textContent?.trim();
                    if (textContent) {
                      nodes.push(schema.nodes.paragraph.create(null, schema.text(textContent)));
                    }
                  }
                }
              });

              if (nodes.length > 0) {
                event.preventDefault();
                const slice = new Slice(Fragment.from(nodes), 0, 0);
                const tr = view.state.tr.replaceSelection(slice);
                view.dispatch(tr);
                return true;
              }
              // If our parsing produced nothing, fall through to plain text
            }

            // Plain-text paste: split on double newlines for paragraphs
            if (!text) return false;

            const { schema } = view.state;
            const blocks = text.split(/\n{2,}/);
            const nodes = blocks
              .map((b) => b.trim())
              .filter(Boolean)
              .map((block) => {
                const lines = block.split(/\n/);
                const inline: any[] = [];
                lines.forEach((line, i) => {
                  if (i > 0) inline.push(schema.nodes.hardBreak.create());
                  if (line) inline.push(schema.text(line));
                });
                return schema.nodes.paragraph.create(null, inline);
              });

            if (nodes.length === 0) return false;

            event.preventDefault();
            const slice = new Slice(Fragment.from(nodes), 0, 0);
            const tr = view.state.tr.replaceSelection(slice);
            view.dispatch(tr);
            return true;
          },
        },
      }),
    ];
  },
});
import { Toggle } from "@/components/ui/toggle";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Undo,
  Redo,
  Quote,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const COLORS = [
  "#000000", "#374151", "#6B7280", "#EF4444", "#F97316",
  "#EAB308", "#22C55E", "#3B82F6", "#8B5CF6", "#EC4899",
];

interface ToolbarProps {
  editor: Editor;
}

function Toolbar({ editor }: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b border-border bg-muted/30">
      <Toggle
        size="sm"
        pressed={editor.isActive("bold")}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
        aria-label="Bold"
      >
        <Bold className="h-3.5 w-3.5" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("italic")}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        aria-label="Italic"
      >
        <Italic className="h-3.5 w-3.5" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("underline")}
        onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
        aria-label="Underline"
      >
        <UnderlineIcon className="h-3.5 w-3.5" />
      </Toggle>

      <div className="w-px h-5 bg-border mx-1" />

      <Toggle
        size="sm"
        pressed={editor.isActive("heading", { level: 1 })}
        onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        aria-label="Heading 1"
      >
        <Heading1 className="h-3.5 w-3.5" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("heading", { level: 2 })}
        onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        aria-label="Heading 2"
      >
        <Heading2 className="h-3.5 w-3.5" />
      </Toggle>

      <div className="w-px h-5 bg-border mx-1" />

      <Toggle
        size="sm"
        pressed={editor.isActive("bulletList")}
        onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
        aria-label="Bullet List"
      >
        <List className="h-3.5 w-3.5" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("orderedList")}
        onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
        aria-label="Ordered List"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("blockquote")}
        onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
        aria-label="Blockquote"
      >
        <Quote className="h-3.5 w-3.5" />
      </Toggle>

      <div className="w-px h-5 bg-border mx-1" />

      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: "left" })}
        onPressedChange={() => editor.chain().focus().setTextAlign("left").run()}
        aria-label="Align Left"
      >
        <AlignLeft className="h-3.5 w-3.5" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: "center" })}
        onPressedChange={() => editor.chain().focus().setTextAlign("center").run()}
        aria-label="Align Center"
      >
        <AlignCenter className="h-3.5 w-3.5" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: "right" })}
        onPressedChange={() => editor.chain().focus().setTextAlign("right").run()}
        aria-label="Align Right"
      >
        <AlignRight className="h-3.5 w-3.5" />
      </Toggle>

      <div className="w-px h-5 bg-border mx-1" />

      <Popover>
        <PopoverTrigger asChild>
          <button
            className="inline-flex items-center justify-center rounded-md text-sm h-9 px-2.5 hover:bg-muted transition-colors"
            aria-label="Text Color"
          >
            <Palette className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="grid grid-cols-5 gap-1.5">
            {COLORS.map((color) => (
              <button
                key={color}
                className="w-6 h-6 rounded-full border border-border hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
                onClick={() => editor.chain().focus().setColor(color).run()}
                aria-label={`Set color ${color}`}
              />
            ))}
          </div>
          <button
            className="w-full text-xs mt-2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => editor.chain().focus().unsetColor().run()}
          >
            Reset color
          </button>
        </PopoverContent>
      </Popover>

      <div className="w-px h-5 bg-border mx-1" />

      <button
        className="inline-flex items-center justify-center rounded-md text-sm h-9 px-2.5 hover:bg-muted transition-colors disabled:opacity-50"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        aria-label="Undo"
      >
        <Undo className="h-3.5 w-3.5" />
      </button>
      <button
        className="inline-flex items-center justify-center rounded-md text-sm h-9 px-2.5 hover:bg-muted transition-colors disabled:opacity-50"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        aria-label="Redo"
      >
        <Redo className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder = "Start writing...",
  className,
  minHeight = "200px",
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      PasteAsParas,
    ],
    content,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none focus:outline-none px-3 py-2",
          "prose-headings:font-display prose-p:my-3 prose-ul:my-1.5 prose-ol:my-1.5 prose-blockquote:my-1.5"
        ),
        style: `min-height: ${minHeight}`,
      },
      // Preserve pasted rich-HTML formatting (bold, italic, lists, etc.)
      transformPastedHTML(html) {
        return html;
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Sync external content changes (e.g., AI insert/replace)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className={cn("rounded-md border border-input bg-background overflow-hidden", className)}>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
