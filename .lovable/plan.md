

# Fix: Downloads Not Working on Mobile and Files Not Opening

## Problem

Two separate issues:

1. **Downloads fail on iPhone/iPad**: The current download method creates an invisible `<a>` element and programmatically clicks it. iOS Safari blocks this pattern -- programmatic clicks on dynamically created links are silently ignored.

2. **EPUB files won't open**: The custom minimal ZIP builder produces files that some e-reader apps reject because it doesn't write proper ZIP local file headers (missing date/time fields, extra field lengths not zeroed consistently).

## Root Cause

All three export types (PDF, EPUB, Word) use the same broken download pattern:
```
const a = document.createElement("a");
a.href = url;
a.download = "file.ext";
document.body.appendChild(a);
a.click();  // <-- blocked on iOS Safari
```

## Solution

### 1. Create a shared download helper -- `src/lib/downloadHelper.ts`

A single robust function that handles triggering downloads across all browsers and devices:

- First tries the standard `<a>` click approach (works on desktop)
- If on iOS/mobile Safari, falls back to `window.open(url, '_blank')` which lets the browser handle the file natively
- Detects iOS/iPad via user agent

### 2. Fix `src/lib/bookExport.ts`

- Replace all three inline download triggers (PDF save, EPUB blob, Word blob) with calls to the new download helper
- For PDF: use `doc.output('blob')` to get a Blob, then pass to the helper instead of relying on jsPDF's built-in `save()` which also uses the broken pattern internally
- Fix the EPUB ZIP builder: zero out the unused date/time and extra-field-length fields in both local and central directory headers to produce spec-compliant ZIP files

### 3. Fix `src/lib/sermonExport.ts`

- Same changes: replace all three inline download triggers with the shared helper
- For PDF: use `doc.output('blob')` + helper
- EPUB and Word already use `buildEpubZip` from bookExport (which gets the ZIP fix) and the blob pattern (which gets the helper fix)

### 4. Files affected

| File | Change |
|------|--------|
| `src/lib/downloadHelper.ts` | New file -- cross-browser download function |
| `src/lib/bookExport.ts` | Use download helper, fix ZIP header fields |
| `src/lib/sermonExport.ts` | Use download helper for all three formats |

No UI or page component changes needed.

