
# Fix: Remove Duplicate Title on Page 2

## Problem

The manuscript parser detects the sermon title as a MAIN POINT heading (because it's typically all-caps). Since the title is already rendered on the dedicated title page (page 1), it then appears again as the first MAIN POINT heading on page 2 -- a duplicate.

## Fix

In `supabase/functions/generate-goodnotes-pdf/index.ts`, after parsing sections from the manuscript, filter out any section whose heading matches the sermon title (case-insensitive comparison). This ensures the title only appears once on the title page.

## File Changed

| File | Change |
|------|--------|
| `supabase/functions/generate-goodnotes-pdf/index.ts` | After building `sections` (line ~199-204), filter out any section whose heading matches `data.title` (case-insensitive). Orphaned bullets from that removed section get prepended to the next section. |

## Technical Detail

After line 204, add filtering logic:

```typescript
// Remove sections whose heading duplicates the sermon title
const filteredSections = sections.filter(s => {
  if (!s.heading) return true;
  return s.heading.trim().toUpperCase() !== data.title.trim().toUpperCase();
});
```

If the removed title-section had bullets, prepend them to the first remaining section so no content is lost.
