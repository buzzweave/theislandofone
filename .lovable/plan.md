

# Fix iPad Downloads + GoodNotes PDF Update

## Root Cause

The `downloads` storage bucket has SELECT and DELETE policies but is **missing an INSERT policy**. When the app tries to upload a generated file for download, it fails silently. The code falls back to a blob URL, which iPad Safari blocks. This affects ALL download formats (PDF, EPUB, Word, GoodNotes).

## Fix 1: Add missing INSERT policy (database migration)

Add an RLS policy allowing anonymous inserts to the `downloads` bucket so the upload step succeeds and produces a real HTTPS URL.

```sql
CREATE POLICY "Anyone can upload downloads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'downloads');
```

## Fix 2: Update GoodNotes PDF to A4 Landscape + 5 Bullets Per Page

Update `supabase/functions/generate-goodnotes-pdf/index.ts`:

- Change format from US Letter portrait to **A4 landscape** (`orientation: "l"`)
- Main point headings: bold text, no bullet character
- Limit to **5 bullet points per page**, then force a new page
- Reset bullet counter after each page break

## Files Changed

| File | Change |
|------|--------|
| Database migration | Add INSERT policy on `storage.objects` for `downloads` bucket |
| `supabase/functions/generate-goodnotes-pdf/index.ts` | A4 landscape, 5 bullets/page max, no bullets on headings |

These two changes together will make all downloads (PDF, EPUB, Word, GoodNotes) work on iPad by ensuring the storage upload succeeds and Safari receives a real HTTPS URL.
