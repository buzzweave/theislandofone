

# Fix Rich Text Editor: Font Size and Quotation Marks

## Issues Identified

### 1. Font Size Not Working
The `Select` dropdown for font size steals focus from the editor when opened. When a size is selected, `editor.chain().focus().setFontSize(val).run()` tries to restore focus, but the **text selection is lost**. Since `setMark` requires a selection to apply to, the font size command silently does nothing.

**Fix:** Save the editor's selection state before the dropdown opens and restore it before applying the font size command.

### 2. Quotation Marks Resetting
When the user types `"`, TipTap serializes it as `&quot;` in HTML. The parent component stores this value, but on subsequent re-renders (e.g., react-query background refetch triggering the `sermonList` dependency in `AdminSermonEditor`'s sync effect), the `isInternalUpdate` flag is already `false`. The `content !== editor.getHTML()` comparison may find a mismatch due to entity encoding differences, triggering `setContent` and resetting the editor.

**Fix:** Replace the simple boolean flag with a **last-known-HTML ref** approach. Instead of a flag that only protects one render cycle, store the last HTML the editor produced. The sync effect only calls `setContent` if the incoming `content` differs from the **last emitted HTML**, not from `editor.getHTML()`. This is resilient to serialization differences and multiple render cycles.

---

## Technical Changes

### File: `src/components/admin/RichTextEditor.tsx`

**A. Font Size -- Save/Restore Selection**

In the `Toolbar` component:
- Add a `useRef` to store the editor's JSON selection state (`{ from, to }`)
- On the Select's `onOpenChange(true)`, capture the current selection
- In `onValueChange`, restore the selection before running the font size command

```text
Before:
  Click Select -> editor loses focus/selection -> setFontSize has no selection -> nothing happens

After:
  Click Select -> save selection to ref -> select size -> restore selection -> setFontSize applies correctly
```

**B. Quotation Marks -- Robust Sync Guard**

Replace the `isInternalUpdate` boolean ref with a `lastEmittedHTML` string ref:

- In `onUpdate`: store `editor.getHTML()` in `lastEmittedHTML.current`, then call `onChange`
- In the sync `useEffect`: compare `content` against `lastEmittedHTML.current` (not `editor.getHTML()`). Only call `setContent` if they differ. After calling `setContent`, update `lastEmittedHTML.current` to the new content.

This approach is more robust because:
- It survives multiple React render cycles (not just the next one)
- It ignores HTML serialization differences between the stored content and editor's internal state
- External updates (AI insert, PDF import) still sync correctly because `lastEmittedHTML` won't match the externally-provided content

