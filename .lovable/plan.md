
# Fix All Downloads for iPad, iPhone, and All Devices

## Problem

The current download approach fails on iPad/iPhone because:
1. **Data URLs** (current iOS fallback) are too large for Safari -- it silently fails or shows a blank tab
2. **Blob URLs** are blocked by mobile Safari's security model
3. Files need to be served from a **real HTTPS URL** with proper `Content-Disposition` and `Content-Type` headers for Safari to trigger its native download sheet and for files to appear in the Files app

## Solution

Upload generated files to cloud storage temporarily, then navigate to the real URL. This gives us proper HTTP headers and full iOS compatibility.

### 1. Create a `downloads` storage bucket

A public bucket for temporary download files. Files will be organized by a unique ID and auto-cleaned.

### 2. Rewrite `src/lib/downloadHelper.ts`

Replace the current data-URL/blob-URL approach with a storage-based strategy:

- **Generate the blob client-side** (existing PDF/EPUB/Word generation stays the same)
- **Upload the blob** to the `downloads` storage bucket with a unique filename
- **Get the public URL** -- this is a real HTTPS URL served with correct headers
- **Trigger the download**:
  - iOS/iPad: `window.location.href = publicUrl` -- forces Safari's native download sheet, files appear in Files app
  - Desktop: Standard `<a download>` click with the public URL

The MIME types will be set correctly during upload:
- PDF: `application/pdf`
- EPUB: `application/epub+zip`
- Word: `application/msword`

### 3. No changes to export logic

`bookExport.ts` and `sermonExport.ts` keep their current document generation logic unchanged. Only the final "trigger download" step changes (it already calls `triggerDownload` from the helper).

### 4. Periodic cleanup (optional edge function)

Add a simple database-less cleanup: files in the `downloads` bucket older than 1 hour can be cleaned by a scheduled function, or we rely on the bucket being low-traffic enough that manual cleanup suffices.

## Files Changed

| File | Change |
|------|--------|
| `src/lib/downloadHelper.ts` | Upload blob to storage, get public URL, use `window.location.href` for iOS |
| Database migration | Create `downloads` public storage bucket |

No changes to `bookExport.ts`, `sermonExport.ts`, `SermonDetail.tsx`, or `BookDetail.tsx` -- they already call `triggerDownload()`.

## How It Works

```text
User clicks "Download PDF"
        |
        v
Client generates blob (jsPDF / ZIP / HTML)
        |
        v
triggerDownload(blob, "filename.pdf")
        |
        v
Upload blob to storage bucket
  with correct Content-Type
        |
        v
Get public HTTPS URL
        |
        v
  iOS?  ----Yes----> window.location.href = url
        |              (Safari download sheet appears,
        No              file saved to Files app)
        |
        v
  <a href=url download=filename>.click()
        (standard browser download)
```

## Why This Works on iPad/iPhone

- Real HTTPS URLs are fully supported by Safari's download manager
- `Content-Disposition: inline` with proper MIME type lets Safari's native handler take over
- No blob URLs, no data URLs, no programmatic tricks that Safari blocks
- Files appear in the Downloads folder in the Files app
- Works identically in Safari and Chrome on iOS
