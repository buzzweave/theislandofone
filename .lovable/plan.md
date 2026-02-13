

# Fix: Sermon Editor Content Resetting on Background Refetch

## Root Cause

The `RichTextEditor` fixes are correct, but they are being bypassed by a higher-level issue in `AdminSermonEditor.tsx`.

**Line 56-62** has this effect:

```typescript
useEffect(() => {
  const active = sermonList.find((s) => s.id === activeId);
  if (active) {
    setDraft(active);   // <-- RESETS entire draft, including manuscript
    setDirty(false);
  }
}, [activeId, sermonList]);  // <-- sermonList triggers on EVERY refetch
```

Every time react-query background-refetches the sermons list, `sermonList` gets a new array reference. This triggers the effect, which calls `setDraft(active)` with the old server data, overwriting whatever the user just typed or formatted. The new `draft.manuscript` then flows into the `RichTextEditor` as a `content` prop that differs from `lastEmittedHTML`, causing the editor to call `setContent` and reset.

## Fix

Split the effect into two concerns:

1. **On `activeId` change**: Load the sermon data into draft (this is correct behavior when switching sermons).
2. **On `sermonList` change**: Do NOT overwrite the draft if `dirty` is true (user has unsaved changes). Only update if the user hasn't made edits yet.

### Technical Change

**File: `src/pages/admin/AdminSermonEditor.tsx` (lines 56-62)**

Replace:
```typescript
useEffect(() => {
  const active = sermonList.find((s) => s.id === activeId);
  if (active) {
    setDraft(active);
    setDirty(false);
  }
}, [activeId, sermonList]);
```

With:
```typescript
const prevActiveId = useRef<string | null>(null);

useEffect(() => {
  const active = sermonList.find((s) => s.id === activeId);
  if (!active) return;

  // Always load when switching to a different sermon
  // Only reload from server if user hasn't made local edits
  if (activeId !== prevActiveId.current || !dirty) {
    setDraft(active);
    setDirty(false);
    prevActiveId.current = activeId;
  }
}, [activeId, sermonList]);
```

This ensures:
- Switching sermons always loads fresh data (correct).
- Background refetches do NOT overwrite the user's in-progress edits (fixes the bug).
- If the user hasn't touched anything (`dirty === false`), the draft stays in sync with server data (keeps data fresh).

This is a ~5-line change in one file that addresses the actual root cause.

