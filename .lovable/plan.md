

# Fix: Eliminate Blank Pages and Slide-Style Rendering in Sermon Export

## Root Cause

The `isHeading()` function in the parsing engine is too aggressive. It treats ANY all-caps text longer than 3 characters as a MAIN POINT heading. This means lines like "OPENING ILLUSTRATION", "CONCLUSION", "APPLICATION", or any short uppercase phrase create their own section -- often with zero bullets. Each section gets its own page, resulting in:

- Blank pages (header-only pages with no bullets)
- "Slide-style" appearance (one line of text centered on an otherwise empty page)
- Broken page 3 layout

## Fix Strategy

Implement a **post-parse cleanup** that eliminates empty sections and merges orphan headers into adjacent content. This is applied after parsing but before page layout, so it fixes all three export paths (PDF, GoodNotes, Word) simultaneously.

## Changes

### 1. `src/lib/pulpitFormat.ts` -- Add empty-section cleanup

| Change | Detail |
|--------|--------|
| New `cleanupSections()` function | After parsing, merge any section with 0 bullets into the next section (prepend as sub-heading text in first bullet) or previous section (append). This prevents blank pages. |
| Update `filterTitleFromSections()` | Also call cleanup logic so orphan headers never survive to layout. |
| Tighten `isHeading()` | Add minimum bullet-context awareness -- a heading that produces an empty section gets folded into surrounding content rather than creating a standalone page. |

Logic for `cleanupSections()`:

```text
For each section:
  If section has 0 bullets:
    If next section exists:
      Prepend this heading as a bold-text bullet to next section
    Else if previous section exists:
      Append this heading as a bullet to previous section
    Remove this empty section
```

### 2. `src/lib/sermonExport.ts` -- Use cleanup in client-side exports

| Change | Detail |
|--------|--------|
| `exportSermonToPdf` | Call `cleanupSections()` after `filterTitleFromSections()` and before `layoutPages()` |
| `exportSermonToWord` | Same cleanup call added |

### 3. `supabase/functions/generate-goodnotes-pdf/index.ts` -- Mirror cleanup in Edge Function

| Change | Detail |
|--------|--------|
| Add `cleanupSections()` function | Same logic as client-side, applied after title filtering and before `layoutPages()` |

## Technical Detail

New function in `pulpitFormat.ts`:

```typescript
export function cleanupSections(sections: PulpitSection[]): PulpitSection[] {
  // Pass 1: merge sections with 0 bullets into neighbors
  const result: PulpitSection[] = [];
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    if (s.bullets.length === 0 && s.heading) {
      // Orphan header -- merge into next section or previous
      const next = sections[i + 1];
      if (next) {
        // Prepend as first bullet (preserves the text)
        next.bullets = [s.heading, ...next.bullets];
      } else if (result.length > 0) {
        result[result.length - 1].bullets.push(s.heading);
      }
      continue; // skip adding this empty section
    }
    result.push(s);
  }
  return result;
}
```

Call order in all export paths:
1. `parsePulpitFormat()` or `parseManuscript()`
2. `filterTitleFromSections()` -- remove title duplicates
3. `cleanupSections()` -- remove empty/orphan sections
4. `layoutPages()` -- paginate into 5-6 bullet pages

## Files Changed

| File | Change |
|------|--------|
| `src/lib/pulpitFormat.ts` | Add `cleanupSections()` export |
| `src/lib/sermonExport.ts` | Call `cleanupSections()` in `exportSermonToPdf` and `exportSermonToWord` |
| `supabase/functions/generate-goodnotes-pdf/index.ts` | Add and call `cleanupSections()` before `layoutPages()` |

## Result

- Zero blank pages -- every page has content
- No orphan headers sitting alone on a page
- Document-flow rendering (not slide-style)
- All three export formats (PDF, Word, GoodNotes) fixed simultaneously
