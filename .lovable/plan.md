

# Fix: Restore GOODNOTES PULPIT FORMAT (A4) with Correct Pagination

## Problems Identified

1. **Bullet range is 5-8 instead of 5-6** -- The `MAX_BULLETS_PER_PAGE` is set to 8, causing pages with too many bullets and broken layouts (especially page 3).
2. **Duplicate title not filtered in client-side exports** -- The title-duplication fix was only applied to the Edge Function, not to the client-side PDF and Word exports in `sermonExport.ts`.
3. **Dynamic spacing can create visual blank space** -- The `dynamicGap` calculation can over-space bullets when there are few, leaving awkward gaps.

## Changes

### 1. `src/lib/pulpitFormat.ts` -- Fix bullet range and add title filter

| Change | Detail |
|--------|--------|
| Change `MAX_BULLETS_PER_PAGE` | From `8` to `6` |
| Change `MIN_BULLETS_PER_PAGE` | Keep at `5` |
| Add `filterTitleSection()` | New exported helper that removes sections whose heading matches the sermon title (case-insensitive) and prepends orphaned bullets to the next section. Used by all three export paths. |

### 2. `supabase/functions/generate-goodnotes-pdf/index.ts` -- Sync bullet range and cap spacing

| Change | Detail |
|--------|--------|
| Change `MAX_BULLETS` | From `8` to `6` |
| Cap `dynamicGap` | Limit maximum gap to `48pt` (instead of `60`) to prevent over-spacing that creates visual blank areas |

### 3. `src/lib/sermonExport.ts` -- Apply title filter to client-side exports

| Change | Detail |
|--------|--------|
| `exportSermonToPdf` | After calling `parsePulpitFormat`, filter out sections whose heading matches `sermon.title` (reuse the new helper from pulpitFormat.ts). Cap `dynamicGap` at `48pt`. |
| `exportSermonToWord` | Same title-section filter applied before `layoutPages`. |

## Technical Detail

New helper in `pulpitFormat.ts`:

```typescript
export function filterTitleFromSections(
  sections: PulpitSection[],
  title: string
): PulpitSection[] {
  const titleUpper = title.trim().toUpperCase();
  const result: PulpitSection[] = [];
  const orphanBullets: string[] = [];

  for (const s of sections) {
    if (s.heading && s.heading.trim().toUpperCase() === titleUpper) {
      orphanBullets.push(...s.bullets);
      continue;
    }
    if (orphanBullets.length > 0 && result.length === 0) {
      s.bullets = [...orphanBullets, ...s.bullets];
      orphanBullets.length = 0;
    }
    result.push(s);
  }
  return result;
}
```

Pagination constants change:
- `MIN_BULLETS_PER_PAGE = 5` (unchanged)
- `MAX_BULLETS_PER_PAGE = 6` (was 8)

This ensures every MAIN POINT page has exactly 5-6 bullets, with overflow continuing on the next page. No blank pages, no broken page 3.

## Files Changed

| File | Change |
|------|--------|
| `src/lib/pulpitFormat.ts` | Change max bullets to 6, add `filterTitleFromSections` helper |
| `supabase/functions/generate-goodnotes-pdf/index.ts` | Change `MAX_BULLETS` to 6, cap dynamic gap at 48pt |
| `src/lib/sermonExport.ts` | Apply title filter in `exportSermonToPdf` and `exportSermonToWord`, cap dynamic gap at 48pt |

