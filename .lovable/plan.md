

# Fix Bullet Points and Quotation Marks in Rich Text Editor

## Problem
Two issues stem from the same root cause:

1. **Bullet points not working** -- Clicking the bullet list button toggles the list, but the `useEffect` content sync immediately resets the editor because the HTML serialization of list markup differs slightly between the parent state and `editor.getHTML()`, causing a false mismatch that triggers `setContent` and undoes the toggle.

2. **Double quotes (`"`) not working** -- Typing `"` produces an HTML entity (`&quot;`) that differs from the raw character stored in parent state, again triggering the sync reset loop.

## Solution
Add a flag (`skipNextSync`) that prevents the `useEffect` from overwriting the editor when the change originated from user typing inside the editor. The `onUpdate` callback sets the flag before calling `onChange`, and the `useEffect` checks/clears it before running `setContent`.

## Technical Changes

**File: `src/components/admin/RichTextEditor.tsx`**

1. Add a `useRef` boolean flag (`isInternalUpdate`).
2. In the `onUpdate` callback, set the flag to `true` before calling `onChange`.
3. In the `useEffect` that syncs `content`, skip the `setContent` call if the flag is `true`, then reset the flag. This ensures external updates (AI insert/replace, PDF import) still sync correctly, while user-driven edits are never overwritten.

```text
Before:
  onUpdate -> onChange(html) -> parent re-renders -> useEffect sees mismatch -> setContent (RESETS EDITOR)

After:
  onUpdate -> flag=true -> onChange(html) -> parent re-renders -> useEffect sees flag -> skip setContent
  External update (AI/PDF) -> parent sets content -> useEffect sees flag=false -> setContent (CORRECT)
```

This is a small, targeted fix (adding ~5 lines) that resolves both issues without changing any other behavior.
