

# Fix Word/PDF Formatting and iPad Downloads

## Problems
1. **Word and PDF strip all formatting** -- `normalizeParagraphs()` calls `stripHtml()` which removes bold, italic, lists, headings, alignment -- everything from the rich text editor is lost
2. **iPad downloads fail** -- `window.open(blobUrl)` with blob URLs is unreliable on iPadOS Safari; it silently fails or shows a blank tab
3. **EPUB stays unchanged** -- per your request, EPUB exports will remain exactly as they are (Kindle-optimized)

## Changes

### 1. `src/lib/downloadHelper.ts` -- Fix iPad downloads

Replace the blob URL approach for iOS/iPad with a **data URL** conversion:
- Convert blob to a base64 data URL using `FileReader.readAsDataURL()`
- Open the data URL in a new tab -- iPad Safari handles data URLs reliably unlike blob URLs
- Desktop download path stays the same (unchanged)

### 2. `src/lib/sermonExport.ts` -- Preserve formatting in Word

**Word export**: Stop calling `normalizeParagraphs()` (which strips HTML). Instead, pass the raw HTML manuscript directly into the Word document body. Word natively renders bold, italic, underline, lists, headings, blockquotes -- exactly what the rich text editor produces.

**PDF export**: Keep as plain text. jsPDF cannot render HTML, so the PDF will remain a clean readable document. No change here.

**EPUB export**: No changes (stays as Kindle download).

### 3. `src/lib/bookExport.ts` -- Preserve formatting in Word for books

Same approach as sermons: the Word export will pass each chapter's raw HTML content directly instead of stripping it. Add base styles for bold, italic, lists, blockquotes so they render properly in Word.

**PDF and EPUB**: No changes.

### Files Changed

| File | Change |
|------|--------|
| `src/lib/downloadHelper.ts` | Convert blob to data URL for iPad instead of blob URL |
| `src/lib/sermonExport.ts` | Word export uses raw HTML instead of stripped text |
| `src/lib/bookExport.ts` | Word export uses raw HTML instead of stripped text |

No changes to EPUB exports, no changes to page components.

