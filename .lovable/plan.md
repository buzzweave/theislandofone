

# Fix: Unknown Column Error When Adding Video

## Problem

When you click "Add Video", the `useAddVideo` hook sends a `sort_order` field to the VPS API (`POST /api/videos`). Your VPS MySQL `videos` table does not have a `sort_order` column, causing the "unknown column" error.

This is the same issue that was previously fixed for books and sermons.

## Root Cause

In `src/pages/admin/AdminVideoManager.tsx` line 102:
```
await addVideo.mutateAsync({ ...form, is_active: true, sort_order: videoList.length });
```

This passes `sort_order` into the payload. Then in `src/hooks/useVideos.ts` line 56-61, `useAddVideo` spreads the entire object (including `sort_order`) into the POST body sent to VPS.

## Fix

**File: `src/hooks/useVideos.ts`** -- Strip `sort_order` from the payload in both `useAddVideo` and `useUpdateVideo` before sending to VPS:

- In `useAddVideo` (lines 55-61): destructure out `sort_order` before spreading into the API payload
- In `useUpdateVideo` (lines 70-75): destructure out `sort_order` before spreading into the API payload

This is a 2-line surgical fix. No UI changes.

## Acceptance Test

- Add a new video in admin -- should save without error
- Edit an existing video -- should save without error
