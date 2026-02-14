

# GOODNOTES PULPIT FORMAT (A4) -- Complete Sermon Formatting System

This is a comprehensive overhaul of the sermon export pipeline. All three export formats (GoodNotes/PDF, standard PDF, and Word) will share a single parsing engine that structures manuscript content into MAIN POINT sections with bullets, then renders each format according to the Pulpit Format spec.

## Overview

```text
Sermon Manuscript (raw HTML from editor)
        |
        v
  pulpitFormatParser()
  Detects MAIN POINT headings, groups bullets
        |
        v
  PulpitData { title, scripture, mainPoints[] }
        |
   +---------+---------+
   |         |         |
   v         v         v
GoodNotes  PDF      Word
(edge fn) (client) (client)
```

## Changes

### 1. New shared parser: `src/lib/pulpitFormat.ts`

A new file containing the GOODNOTES PULPIT FORMAT parsing engine, shared by all three export functions.

**Parser logic:**
- Strips HTML from manuscript
- Detects MAIN POINT headings using heuristics:
  - Lines matching `MAIN POINT` (case-insensitive)
  - Lines that are all-caps and under 150 chars
  - Lines starting with Roman numerals (I, II, III, IV...) or numbered patterns
  - Lines ending with a colon
- Groups subsequent lines as bullet points under each MAIN POINT
- Each bullet is capped at 1-2 sentences (split on sentence boundaries if too long)
- Returns structured data: `{ title, scripture, sections: [{ heading, bullets }] }`

**Dynamic page layout calculator:**
- Given A4 portrait dimensions (595 x 842 pt), 1-inch margins, heading at 28pt, bullets at 16pt
- Calculates how many bullets fit on one page (between 5 and 8)
- If a MAIN POINT has more bullets than fit, splits into continuation pages
- Ensures no orphan bullets, no blank half-pages

### 2. Update `supabase/functions/generate-goodnotes-pdf/index.ts`

Complete rewrite of the `generatePdf` function to implement the Pulpit Format:

**Page 1 -- Title Page:**
- Title: 44pt bold, centered
- Scripture reference: 24pt bold uppercase
- Scripture text: 18pt, clean spacing
- Author line, copyright

**Subsequent pages -- one MAIN POINT per page:**
- MAIN POINT heading: 28pt bold, uppercase, LEFT-ALIGNED, NO bullet character
- Example: `MAIN POINT III -- KINGS SEAT BY COVENANT, NOT PERFORMANCE`
- Below heading: 5-8 bullet points at 16pt with round bullet character
- Generous spacing between bullets for handwriting
- If bullets overflow, continue on next page (no heading repeated, just bullets)

**Layout engine:**
- Calculate usable height per page = 842 - 72 - 72 = 698 pt
- Heading block = ~40 pt (28pt font + spacing)
- Each bullet line = ~24 pt (16pt font + spacing)
- Available for bullets = 698 - 40 = 658 pt
- Max bullets per page = floor(658 / 24) = ~27 raw lines, but capped at 8 logical bullets
- Min 5 bullets per page enforced
- Footer copyright on last page only

Also update the `parseManuscript` function with better heading detection including `MAIN POINT` keyword matching and Roman numeral patterns.

### 3. Update `src/lib/sermonExport.ts` -- All three exports

**`exportSermonToPdf` (standard PDF):**
- Change from A5 to A4 portrait
- Use the shared pulpit format parser
- Title page with 44pt bold centered title
- Scripture section with 24pt uppercase header
- Each MAIN POINT on its own page, 28pt bold uppercase left-aligned
- Bullets at 16pt with round bullet character, 5-8 per page
- 1-inch margins throughout

**`exportSermonToWord` (Word .doc):**
- Use the shared pulpit format parser to structure content
- Generate HTML with explicit `page-break-before: always` before each MAIN POINT
- Title: 40pt bold centered
- Scripture header: 24pt bold uppercase
- Main Point headers: 28pt bold uppercase, left-aligned, no bullet
- Bullets: 16pt with bullet character, spaced for readability
- A4 page size via Word XML namespace
- Margins set to 1 inch via CSS

**`exportSermonToGoodNotesPdf`:**
- No changes to the function itself (it calls the edge function)
- The edge function handles all formatting

**`exportSermonToEpub`:**
- No changes (EPUB is for e-readers, not pulpit format)

### 4. Update button labels in `src/pages/SermonDetail.tsx`

Update the download section descriptions to reflect the unified format:
- GoodNotes: "iPad pulpit format (A4)"
- PDF: "Print-ready pulpit format"
- Word: "Editable pulpit format"
- EPUB: unchanged

## Files Changed

| File | Change |
|------|--------|
| `src/lib/pulpitFormat.ts` | New -- shared parser and layout calculator |
| `supabase/functions/generate-goodnotes-pdf/index.ts` | Rewrite PDF generation with full Pulpit Format spec |
| `src/lib/sermonExport.ts` | Update PDF and Word exports to use Pulpit Format |
| `src/pages/SermonDetail.tsx` | Update button descriptions |

## Technical Details

### Text Hierarchy (exact sizes)

| Element | Font Size | Weight | Alignment | Case |
|---------|-----------|--------|-----------|------|
| Title | 44pt | Bold | Center | As-is |
| Scripture Header | 24pt | Bold | Left | UPPERCASE |
| Scripture Text | 18pt | Normal | Left | As-is |
| Main Point Header | 28pt | Bold | Left | UPPERCASE |
| Bullet Point | 16pt | Normal | Left | As-is |
| Copyright | 9pt | Italic | Center | As-is |

### Page Break Rules

1. Title + scripture always on page 1
2. Each MAIN POINT starts a new page
3. Heading never splits across pages (always at top)
4. Bullets never break mid-sentence across pages
5. 5-8 bullets per page, dynamically balanced
6. Overflow bullets continue on next page without repeating heading
7. No orphan bullets (single bullet alone at page bottom)
8. No blank half-pages

### Heading Detection Patterns

The parser identifies MAIN POINT headings by matching lines that contain:
- `MAIN POINT` (case-insensitive)
- Roman numeral prefixes: `I.`, `II.`, `III —`, `IV:`, etc.
- All-uppercase lines under 150 characters
- Numbered patterns like `1.`, `2)`, `3 -`

Everything between headings becomes bullet points for that section.

