

# Fix: Sermon List Inaccessible on iPhone

## Problem

When existing sermons are loaded, a `useEffect` automatically selects the first sermon whenever `activeId` is `null`. On mobile, the list and editor are shown exclusively (not side-by-side), so this auto-selection immediately forces the user into the editor view. Tapping "Back to list" sets `activeId` to `null`, but the effect fires again and re-selects, creating an inescapable loop. The user can never reach the list view to tap the "+" (new sermon) button.

## Fix

**File: `src/pages/admin/AdminSermonEditor.tsx`**

Change the auto-select `useEffect` so it only runs on desktop (not mobile). On mobile, the user should land on the list view and manually tap a sermon to open it.

```text
Before:
  useEffect(() => {
    if (!activeId && sermonList.length > 0) {
      setActiveId(sermonList[0].id);
    }
  }, [sermonList, activeId]);

After:
  useEffect(() => {
    if (!activeId && sermonList.length > 0 && !isMobile) {
      setActiveId(sermonList[0].id);
    }
  }, [sermonList, activeId, isMobile]);
```

This single-line change (`&& !isMobile`) ensures:
- **Desktop**: First sermon is auto-selected as before (split-pane layout shows both list and editor).
- **Mobile/iPhone**: User lands on the sermon list, can tap "+" to create, or tap any sermon to edit. "Back to list" works correctly.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/admin/AdminSermonEditor.tsx` | Add `&& !isMobile` guard to auto-select useEffect |

