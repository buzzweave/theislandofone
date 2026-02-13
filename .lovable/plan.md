

# Upgrade Rich Text Editor with Full Writing Features

## Overview

Replace the current minimal TipTap toolbar with a comprehensive, professionally organized editor that includes all existing features plus many new ones useful for long-form writing (sermons, books, blog posts).

## New Features to Add

**Text Formatting**
- Strikethrough
- Highlight (background color)
- Superscript and Subscript

**Structure**
- Heading 3 support in toolbar
- Horizontal rule / divider
- Code block (for scripture references or technical quotes)

**Links**
- Insert/edit hyperlinks with a URL input popover

**Indentation**
- Indent / Outdent buttons for paragraphs and lists

**Find and Replace** (optional -- stretch)
- Skipping this to keep scope manageable; can add later

**Toolbar Organization**
- Group buttons into clearly labeled sections with dividers
- Two-row toolbar layout for better organization on desktop
- Responsive wrapping on mobile

## Technical Changes

### New TipTap Extensions to Install

These are already included in `@tiptap/starter-kit` or available as separate packages:
- `@tiptap/extension-highlight` -- text highlight
- `@tiptap/extension-link` -- clickable links
- `@tiptap/extension-superscript` -- superscript
- `@tiptap/extension-subscript` -- subscript
- `@tiptap/extension-placeholder` -- proper placeholder text

StarterKit already includes: strikethrough, code block, horizontal rule.

### File: `src/components/admin/RichTextEditor.tsx`

**A. Add new extensions to the editor config:**
```typescript
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import Placeholder from "@tiptap/extension-placeholder";
```

**B. Rebuild the Toolbar with grouped sections:**

```text
Row 1: [Bold | Italic | Underline | Strikethrough] | [H1 | H2 | H3] | [Font Size] | [Text Color | Highlight]
Row 2: [Bullet | Ordered | Blockquote | Code Block | Divider] | [Align L | C | R] | [Indent | Outdent] | [Link] | [Superscript | Subscript] | [Undo | Redo]
```

- All buttons use plain `<button>` elements (not Toggle components) for reliability
- Each group separated by a visual divider
- Sticky toolbar that stays visible when scrolling long content

**C. Link insertion:**
- A small popover with a URL input field
- "Set Link" and "Remove Link" actions

**D. Placeholder extension:**
- Shows the `placeholder` prop text when the editor is empty (proper gray placeholder, not just relying on HTML attributes)

**E. Keep all existing sync logic intact:**
- `lastEmittedHTML` ref approach stays
- `PasteAsParas` extension stays
- `FontSize` custom extension stays
- `savedSelection` ref for font size dropdown stays

### Styling

- Add sticky positioning to toolbar so it stays visible during long documents
- Add subtle group labels or tooltips for discoverability
- Slightly larger editor padding for a more comfortable writing experience
- Word count display at the bottom of the editor

### No Changes to Parent Components

The `RichTextEditorProps` interface stays identical:
```typescript
interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}
```

All five consumers (`AdminSermonEditor`, `AdminBookEditor`, `AdminBlogManager`, `SortableChapterList`, and any future uses) will automatically get the upgraded editor with zero changes.

## Summary of New Dependencies

| Package | Purpose |
|---|---|
| `@tiptap/extension-highlight` | Background highlight color |
| `@tiptap/extension-link` | Hyperlinks |
| `@tiptap/extension-superscript` | Superscript text |
| `@tiptap/extension-subscript` | Subscript text |
| `@tiptap/extension-placeholder` | Proper placeholder text |

## Files Modified

- `src/components/admin/RichTextEditor.tsx` -- Full rewrite of toolbar + new extensions
- `package.json` -- 5 new TipTap extension dependencies

