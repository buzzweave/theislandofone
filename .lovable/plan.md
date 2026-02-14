

# Add Proper Download Formats for Sermons and Books

## Problem

1. **Sermons**: The download buttons (PDF, EPUB, Word) all generate plain text files with wrong extensions -- not actual formatted documents.
2. **Books**: Only has PDF and EPUB downloads. Missing Word format entirely.

## Solution

### 1. Create `src/lib/sermonExport.ts` -- New file

Add three export functions for sermons that mirror the quality of book exports:

- **`exportSermonToPdf`**: Uses jsPDF to generate a properly formatted A5 PDF with title page (title, scripture, author, copyright), followed by the manuscript body with paragraph indentation and page breaks.
- **`exportSermonToEpub`**: Uses the same minimal ZIP/EPUB builder pattern from `bookExport.ts` to create a valid EPUB with metadata, table of contents, and styled content.
- **`exportSermonToWord`**: Generates an HTML-based `.doc` file (Microsoft Word compatible) with proper styling, headers, and copyright footer. This uses the `application/msword` MIME type with an HTML document that Word can open natively.

All three will strip HTML from the manuscript, normalize paragraphs, and append the copyright notice.

### 2. Update `src/lib/bookExport.ts` -- Add Word export

Add a new `exportBookToWord` function that generates an HTML-based `.doc` file containing:
- Title page with book title, subtitle, author
- Each chapter as a section with chapter number heading, title, and body
- Copyright footer

Also export the `stripHtml` and `normalizeParagraphs` helper functions so `sermonExport.ts` can reuse them.

### 3. Update `src/pages/SermonDetail.tsx` -- Wire up real exports

Replace the `handleDownload` function (lines 61-70) with calls to the new dedicated export functions from `sermonExport.ts`. Each format button will call its specific function.

### 4. Update `src/pages/BookDetail.tsx` -- Add Word download button

Add a third download button for Word format alongside the existing PDF and EPUB buttons (around line 127-132), calling the new `exportBookToWord` function.

## Technical Notes

- The Word export uses the standard HTML-to-DOC technique (an HTML file saved with `.doc` extension and `application/msword` MIME type). This opens correctly in Microsoft Word, Google Docs, and LibreOffice without requiring complex OOXML generation.
- The `stripHtml` and `normalizeParagraphs` functions will be exported from `bookExport.ts` to be shared with `sermonExport.ts`, avoiding code duplication.
- The sermon type information will be imported from `useSermons` hook's `Sermon` type.

