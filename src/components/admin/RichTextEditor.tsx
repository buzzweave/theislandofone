import { useEditor, EditorContent, type Editor, Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import Placeholder from "@tiptap/extension-placeholder";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Slice, Fragment } from "@tiptap/pm/model";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Highlighter,
  Undo,
  Redo,
  Quote,
  Type,
  Code2,
  Minus,
  Link as LinkIcon,
  Unlink,
  Superscript as SuperscriptIcon,
  Subscript as SubscriptIcon,
  Indent,
  Outdent,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ───────── Custom FontSize extension ───────── */
const FontSize = Extension.create({
  name: "fontSize",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize?.replace(/['"]+/g, "") || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }: any) => chain().setMark("textStyle", { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }: any) => chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
    } as any;
  },
});

/* ───────── Custom Indent extension ───────── */
const IndentExtension = Extension.create({
  name: "indent",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading", "listItem"],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const ml = element.style.marginLeft;
              return ml ? parseInt(ml, 10) / 40 : 0;
            },
            renderHTML: (attributes) => {
              if (!attributes.indent || attributes.indent <= 0) return {};
              return { style: `margin-left: ${attributes.indent * 40}px` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      indent:
        () =>
        ({ tr, state, dispatch }: any) => {
          const { selection } = state;
          const { from, to } = selection;
          state.doc.nodesBetween(from, to, (node: any, pos: number) => {
            if (node.type.name === "paragraph" || node.type.name === "heading" || node.type.name === "listItem") {
              const currentIndent = node.attrs.indent || 0;
              if (currentIndent < 10) {
                tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: currentIndent + 1 });
              }
            }
          });
          if (dispatch) dispatch(tr);
          return true;
        },
      outdent:
        () =>
        ({ tr, state, dispatch }: any) => {
          const { selection } = state;
          const { from, to } = selection;
          state.doc.nodesBetween(from, to, (node: any, pos: number) => {
            if (node.type.name === "paragraph" || node.type.name === "heading" || node.type.name === "listItem") {
              const currentIndent = node.attrs.indent || 0;
              if (currentIndent > 0) {
                tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: currentIndent - 1 });
              }
            }
          });
          if (dispatch) dispatch(tr);
          return true;
        },
    } as any;
  },
});

/* ───────── PasteAsParas extension (preserved) ───────── */
const PasteAsParas = Extension.create({
  name: "pasteAsParas",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("pasteAsParas"),
        props: {
          handlePaste(view, event) {
            const html = event.clipboardData?.getData("text/html");
            if (html) return false;
            const text = event.clipboardData?.getData("text/plain");
            if (!text) return false;
            const { schema } = view.state;
            const lines = text.split(/\n/);
            const nodes: any[] = [];
            for (const line of lines) {
              if (line.trim() === "") {
                nodes.push(schema.nodes.paragraph.create());
              } else {
                nodes.push(schema.nodes.paragraph.create(null, schema.text(line)));
              }
            }
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

/* ───────── Constants ───────── */
const COLORS = [
  "#000000", "#374151", "#6B7280", "#EF4444", "#F97316",
  "#EAB308", "#22C55E", "#3B82F6", "#8B5CF6", "#EC4899",
];

const HIGHLIGHT_COLORS = [
  "#FEF08A", "#BBF7D0", "#BFDBFE", "#E9D5FF", "#FECDD3",
  "#FED7AA", "#A5F3FC", "#D1D5DB",
];

const FONT_SIZES = [
  { label: "Small", value: "12px" },
  { label: "Normal", value: "16px" },
  { label: "Medium", value: "18px" },
  { label: "Large", value: "20px" },
  { label: "X-Large", value: "24px" },
  { label: "XX-Large", value: "32px" },
  { label: "Huge", value: "40px" },
];

/* ───────── Toolbar button helper ───────── */
function TBtn({
  active,
  disabled,
  onClick,
  children,
  label,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center rounded-md h-8 w-8 transition-colors",
        active ? "bg-accent text-accent-foreground" : "hover:bg-muted text-muted-foreground hover:text-foreground",
        disabled && "opacity-40 pointer-events-none"
      )}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-6 bg-border mx-0.5 shrink-0" />;
}

/* ───────── Link Popover ───────── */
function LinkPopover({ editor }: { editor: Editor }) {
  const [url, setUrl] = useState("");
  const [open, setOpen] = useState(false);

  const handleOpen = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        const existing = editor.getAttributes("link")?.href || "";
        setUrl(existing);
      }
      setOpen(isOpen);
    },
    [editor]
  );

  const applyLink = useCallback(() => {
    if (url.trim()) {
      const href = url.match(/^https?:\/\//) ? url : `https://${url}`;
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }
    setOpen(false);
  }, [url, editor]);

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center rounded-md h-8 w-8 transition-colors",
            editor.isActive("link") ? "bg-accent text-accent-foreground" : "hover:bg-muted text-muted-foreground hover:text-foreground"
          )}
          aria-label="Insert link"
          title="Insert link"
        >
          <LinkIcon className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-muted-foreground">URL</label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="h-8 text-sm"
            onKeyDown={(e) => e.key === "Enter" && applyLink()}
          />
          <div className="flex gap-1.5">
            <Button size="sm" className="h-7 text-xs flex-1" onClick={applyLink}>
              Set Link
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => {
                editor.chain().focus().unsetLink().run();
                setOpen(false);
              }}
            >
              <Unlink className="h-3 w-3 mr-1" /> Remove
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ───────── Toolbar ───────── */
function Toolbar({ editor }: { editor: Editor }) {
  const currentFontSize = editor.getAttributes("textStyle")?.fontSize || null;
  const savedSelection = useRef<{ from: number; to: number } | null>(null);

  return (
    <div className="sticky top-0 z-10 border-b border-border bg-muted/50 backdrop-blur-sm">
      {/* Row 1 */}
      <div className="flex flex-wrap items-center gap-0.5 px-1.5 pt-1.5 pb-0.5">
        {/* Text formatting */}
        <TBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} label="Bold">
          <Bold className="h-3.5 w-3.5" />
        </TBtn>
        <TBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} label="Italic">
          <Italic className="h-3.5 w-3.5" />
        </TBtn>
        <TBtn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} label="Underline">
          <UnderlineIcon className="h-3.5 w-3.5" />
        </TBtn>
        <TBtn active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} label="Strikethrough">
          <Strikethrough className="h-3.5 w-3.5" />
        </TBtn>

        <Divider />

        {/* Headings */}
        <TBtn active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} label="Heading 1">
          <Heading1 className="h-3.5 w-3.5" />
        </TBtn>
        <TBtn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} label="Heading 2">
          <Heading2 className="h-3.5 w-3.5" />
        </TBtn>
        <TBtn active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} label="Heading 3">
          <Heading3 className="h-3.5 w-3.5" />
        </TBtn>

        <Divider />

        {/* Font Size */}
        <Select
          value={currentFontSize || ""}
          onValueChange={(val) => {
            if (savedSelection.current) {
              editor.chain().focus().setTextSelection(savedSelection.current).run();
            }
            if (val === "reset") {
              (editor.chain().focus() as any).unsetFontSize().run();
            } else {
              (editor.chain().focus() as any).setFontSize(val).run();
            }
          }}
        >
          <SelectTrigger
            className="h-8 w-[100px] text-xs border-none bg-transparent hover:bg-muted"
            onPointerDown={() => {
              const { from, to } = editor.state.selection;
              savedSelection.current = { from, to };
            }}
          >
            <Type className="h-3.5 w-3.5 mr-1 shrink-0" />
            <SelectValue placeholder="Size" />
          </SelectTrigger>
          <SelectContent>
            {FONT_SIZES.map((s) => (
              <SelectItem key={s.value} value={s.value} className="text-xs">
                {s.label}
              </SelectItem>
            ))}
            <SelectItem value="reset" className="text-xs text-muted-foreground">
              Reset
            </SelectItem>
          </SelectContent>
        </Select>

        <Divider />

        {/* Text Color */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md h-8 w-8 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Text color"
              title="Text color"
            >
              <Palette className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="grid grid-cols-5 gap-1.5">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="w-6 h-6 rounded-full border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => editor.chain().focus().setColor(color).run()}
                  aria-label={`Color ${color}`}
                />
              ))}
            </div>
            <button
              type="button"
              className="w-full text-xs mt-2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => editor.chain().focus().unsetColor().run()}
            >
              Reset color
            </button>
          </PopoverContent>
        </Popover>

        {/* Highlight */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "inline-flex items-center justify-center rounded-md h-8 w-8 transition-colors",
                editor.isActive("highlight") ? "bg-accent text-accent-foreground" : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
              aria-label="Highlight"
              title="Highlight"
            >
              <Highlighter className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="grid grid-cols-4 gap-1.5">
              {HIGHLIGHT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => editor.chain().focus().toggleHighlight({ color }).run()}
                  aria-label={`Highlight ${color}`}
                />
              ))}
            </div>
            <button
              type="button"
              className="w-full text-xs mt-2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => editor.chain().focus().unsetHighlight().run()}
            >
              Remove highlight
            </button>
          </PopoverContent>
        </Popover>
      </div>

      {/* Row 2 */}
      <div className="flex flex-wrap items-center gap-0.5 px-1.5 pb-1.5 pt-0.5">
        {/* Lists & blocks */}
        <TBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} label="Bullet list">
          <List className="h-3.5 w-3.5" />
        </TBtn>
        <TBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} label="Numbered list">
          <ListOrdered className="h-3.5 w-3.5" />
        </TBtn>
        <TBtn active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} label="Blockquote">
          <Quote className="h-3.5 w-3.5" />
        </TBtn>
        <TBtn active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} label="Code block">
          <Code2 className="h-3.5 w-3.5" />
        </TBtn>
        <TBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} label="Horizontal rule">
          <Minus className="h-3.5 w-3.5" />
        </TBtn>

        <Divider />

        {/* Alignment */}
        <TBtn active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} label="Align left">
          <AlignLeft className="h-3.5 w-3.5" />
        </TBtn>
        <TBtn active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} label="Align center">
          <AlignCenter className="h-3.5 w-3.5" />
        </TBtn>
        <TBtn active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} label="Align right">
          <AlignRight className="h-3.5 w-3.5" />
        </TBtn>

        <Divider />

        {/* Indent */}
        <TBtn onClick={() => (editor.chain().focus() as any).indent().run()} label="Indent">
          <Indent className="h-3.5 w-3.5" />
        </TBtn>
        <TBtn onClick={() => (editor.chain().focus() as any).outdent().run()} label="Outdent">
          <Outdent className="h-3.5 w-3.5" />
        </TBtn>

        <Divider />

        {/* Link */}
        <LinkPopover editor={editor} />

        <Divider />

        {/* Super/Subscript */}
        <TBtn active={editor.isActive("superscript")} onClick={() => editor.chain().focus().toggleSuperscript().run()} label="Superscript">
          <SuperscriptIcon className="h-3.5 w-3.5" />
        </TBtn>
        <TBtn active={editor.isActive("subscript")} onClick={() => editor.chain().focus().toggleSubscript().run()} label="Subscript">
          <SubscriptIcon className="h-3.5 w-3.5" />
        </TBtn>

        <Divider />

        {/* Undo / Redo */}
        <TBtn disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()} label="Undo">
          <Undo className="h-3.5 w-3.5" />
        </TBtn>
        <TBtn disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()} label="Redo">
          <Redo className="h-3.5 w-3.5" />
        </TBtn>
      </div>
    </div>
  );
}

/* ───────── Word count helper ───────── */
function getWordCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/* ───────── Main Editor Component ───────── */
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
  const lastEmittedHTML = useRef(content);
  const [wordCount, setWordCount] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline cursor-pointer" },
      }),
      Superscript,
      Subscript,
      Placeholder.configure({ placeholder }),
      FontSize,
      IndentExtension,
      PasteAsParas,
    ],
    content,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm prose-invert max-w-none focus:outline-none px-4 py-3",
          "prose-headings:font-display prose-p:my-3 prose-ul:my-1.5 prose-ol:my-1.5 prose-blockquote:my-1.5"
        ),
        style: `min-height: ${minHeight}`,
      },
      transformPastedHTML(html) {
        return html;
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      lastEmittedHTML.current = html;
      onChange(html);
      setWordCount(getWordCount(editor.state.doc.textContent));
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (content === lastEmittedHTML.current) return;
    editor.commands.setContent(content, { emitUpdate: false });
    lastEmittedHTML.current = content;
    setWordCount(getWordCount(editor.state.doc.textContent));
  }, [content, editor]);

  // Initial word count
  useEffect(() => {
    if (editor) {
      setWordCount(getWordCount(editor.state.doc.textContent));
    }
  }, [editor]);

  if (!editor) return null;

  return (
    <div className={cn("rounded-md border border-input bg-background overflow-hidden", className)}>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
      <div className="flex items-center justify-end px-3 py-1.5 border-t border-border bg-muted/30">
        <span className="text-xs text-muted-foreground">{wordCount} {wordCount === 1 ? "word" : "words"}</span>
      </div>
    </div>
  );
}
