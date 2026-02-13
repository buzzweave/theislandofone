
# Fix Graphics Admin: Multi-Upload and Mobile-Friendly

## Problem
The current upload flow uses programmatic `document.createElement("input")` which:
1. Only allows selecting one file at a time (no `multiple` attribute)
2. Requires two separate file picker dialogs (preview then download file) -- confusing on mobile
3. Has no visible upload UI -- just invisible inputs triggered by JavaScript

## Solution

### Simplify the upload flow
Instead of requiring two separate file selections (preview + download), use a single multi-file picker. Each selected image will be used as both the preview AND the downloadable file. This is much more practical for phone usage.

### Changes to `src/pages/admin/AdminGraphics.tsx`

1. **Enable multi-file selection**: Add `multiple` attribute to the file input so users can select many images at once from their phone gallery.

2. **Simplify to single file picker**: Use the same image for both preview and download (the current two-step picker is impractical on mobile). Each selected file uploads as both preview and download.

3. **Batch upload with progress**: Loop through all selected files, uploading each one sequentially with a progress indicator showing "Uploading 3 of 7..."

4. **Mobile-friendly button sizing**: Make the "Add Graphic" button larger with touch-friendly padding on small screens.

5. **Responsive card layout**: Ensure graphic cards stack vertically on mobile with appropriately sized touch targets for all action buttons.

### Technical Details

```text
Current flow:
  Click "Add" -> Pick 1 preview image -> Pick 1 download file -> Upload

New flow:
  Click "Add" -> Pick multiple images -> Upload all (each image = preview + download)
```

Key code changes:
- `handleAddClick`: Create input with `multiple` attribute, iterate over `files` list
- New `addGraphicSimple(file: File)` helper that uploads the same file for both preview and download URLs
- Add upload progress state: `uploadProgress: { current: number, total: number } | null`
- Display progress text in button: "Uploading 3 of 7..."
- Add responsive classes to action buttons and card layout for better mobile touch targets
