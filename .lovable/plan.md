

# Fix Sermon Downloads

## Problem
The download buttons in `SermonDetail.tsx` (line 170-184) try to open a URL to a `download-sermon` edge function that **does not exist**. The actual working export functions (`exportSermonToPdf`, `exportSermonToEpub`, `exportSermonToWord`, `exportSermonToGoodNotesPdf`) are already built in `src/lib/sermonExport.ts` but are never called.

## Solution
Replace the `handleDownload` function in `SermonDetail.tsx` to directly call the client-side export functions from `sermonExport.ts` instead of opening a non-existent edge function URL.

## Technical Changes

### File: `src/pages/SermonDetail.tsx`

1. **Add import** for the export functions at the top:
   - `importsermonExport.ts` exports: `exportSermonToPdf`, `exportSermonToEpub`, `exportSermonToWord`, `exportSermonToGoodNotesPdf`

2. **Rewrite `handleDownload`** (lines 170-184) to call the correct function based on format:
   - `"pdf"` calls `exportSermonToPdf(sermon)`
   - `"epub"` calls `exportSermonToEpub(sermon)`
   - `"word"` calls `exportSermonToWord(sermon)`
   - `"goodnotes"` calls `exportSermonToGoodNotesPdf(sermon)`

3. **Remove unused references** to the edge function URL construction and `window.open` call.

No database changes, no new edge functions, no new dependencies needed. The export logic and download helper already handle all platforms (iOS, Android, desktop).

