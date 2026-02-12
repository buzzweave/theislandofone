

## Fix EPUB Download 404 Error

### Root Cause

In `src/lib/bookExport.ts`, the `exportBookToEpub` function creates a temporary blob URL, triggers a download click, and then immediately revokes the URL. The browser download is asynchronous, so by the time it tries to fetch the blob, the URL has already been destroyed -- resulting in a 404.

### Fix (single file change)

**File: `src/lib/bookExport.ts`** (lines 261-266)

Delay the `URL.revokeObjectURL` call using `setTimeout` so the browser has time to initiate the download before the blob URL is cleaned up.

```typescript
// Before (broken):
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = `${book.title.replace(/[^a-zA-Z0-9]/g, "_")}.epub`;
a.click();
URL.revokeObjectURL(url);

// After (fixed):
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = `${book.title.replace(/[^a-zA-Z0-9]/g, "_")}.epub`;
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
setTimeout(() => URL.revokeObjectURL(url), 10000);
```

Key changes:
- Append the anchor to the DOM before clicking (required by some browsers like Firefox)
- Remove it from DOM after click
- Delay blob URL cleanup by 10 seconds so the download has time to start

