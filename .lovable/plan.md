

# GoodNotes PDF Export + iPad-Safe Download

## Approach

Use a backend function to generate the PDF server-side and stream it directly to the browser with proper HTTP headers. The frontend navigates to the function URL, which triggers Safari's native download sheet on iPad/iPhone. No file storage needed -- the PDF is generated on-the-fly and streamed.

## Changes

### 1. New backend function: `generate-goodnotes-pdf`

Creates a new function at `supabase/functions/generate-goodnotes-pdf/index.ts` that:

- Accepts a POST request with sermon data (title, scripture reference, scripture text, main points with headings and bullets)
- Also accepts the existing Sermon object format (falls back to parsing `manuscript` HTML into structured sections)
- Uses jsPDF (imported from esm.sh) to generate a US Letter PDF with GoodNotes-optimized formatting:
  - Title: 40pt bold, centered at top
  - "SCRIPTURE" section header: 22pt bold
  - Scripture reference: 18pt italic on its own line
  - Scripture text: 16pt with generous line spacing
  - "MAIN POINTS" section header: 22pt bold
  - Each main point heading: 20pt bold
  - Bullet points: 16pt with bullet character prefix and generous spacing
  - Margins: 1 inch on all sides for handwriting room
  - Automatic page breaks with clean content flow
- Returns the PDF as a binary stream with headers:
  - `Content-Type: application/pdf`
  - `Content-Disposition: attachment; filename="sermon-title-slug-date.pdf"`
  - `Cache-Control: no-store`

### 2. Update `src/lib/sermonExport.ts` -- Add GoodNotes export function

Add a new `exportSermonToGoodNotesPdf` function that:

- Constructs the sermon payload from the existing Sermon object
- For iOS devices: opens `window.location.href` pointing to the edge function URL with the data encoded, triggering Safari's native download sheet
- For desktop: uses fetch to POST the data, receives the PDF blob, and triggers download via anchor tag
- Falls back to client-side jsPDF generation if the server call fails

### 3. Update `src/pages/SermonDetail.tsx` -- Add GoodNotes download button

Add a prominent "Download for GoodNotes (PDF)" button in the download section with a tablet icon. This sits alongside the existing PDF, EPUB, and Word download options. The button calls the new `exportSermonToGoodNotesPdf` function.

### 4. Keep existing downloads unchanged

The current PDF, EPUB, and Word download buttons continue to work exactly as they do now through the storage bucket approach. The GoodNotes PDF is an additional download option.

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/generate-goodnotes-pdf/index.ts` | New -- generates GoodNotes-formatted PDF server-side with proper HTTP headers |
| `src/lib/sermonExport.ts` | Add `exportSermonToGoodNotesPdf` function |
| `src/pages/SermonDetail.tsx` | Add "Download for GoodNotes (PDF)" button |

## How iPad Download Works

```text
User taps "Download for GoodNotes (PDF)"
        |
        v
Frontend builds form with sermon data
        |
        v
Submits POST to edge function URL
        |
        v
Edge function generates PDF with jsPDF
Returns binary with Content-Type: application/pdf
and Content-Disposition: attachment
        |
        v
Safari receives PDF with proper headers
        |
        v
Native download sheet appears
File saved to Files app > Downloads
```

No blob URLs, no data URLs, no storage upload -- the PDF streams directly from server to browser with correct MIME headers, which Safari handles natively.

