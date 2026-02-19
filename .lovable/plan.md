

# Fix: Admin Graphics Not Showing

## Problem

The `AdminGraphics` page has a race condition bug:

1. On mount, it calls `fetchAll()` which tries `/api/graphics/admin` on the VPS
2. If that endpoint fails (auth issue, network error, etc.), it falls back to `graphics` from `useGraphics()`
3. But at mount time, `graphics` is still `[]` (loading)
4. The `useEffect` has an empty dependency array `[]`, so it never re-runs when the public graphics data arrives later

This means the admin page always shows "No graphics yet."

## Fix

Update the `useEffect` in `AdminGraphics.tsx` to include `fetchAll` in its dependency array. Since `fetchAll` is wrapped in `useCallback` with `[graphics]` as a dependency, it will automatically re-run when the public graphics data finishes loading -- providing a working fallback.

### Technical Change (single file)

**File: `src/pages/admin/AdminGraphics.tsx`**

Change line ~109:
```
// Before
useEffect(() => { fetchAll(); }, []);

// After
useEffect(() => { fetchAll(); }, [fetchAll]);
```

This ensures that when the VPS admin endpoint fails, the fallback to public graphics data actually works because `fetchAll` is re-created (and thus re-invoked) once the public data loads.

