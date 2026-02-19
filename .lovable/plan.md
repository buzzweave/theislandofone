

# Fix: Admin Graphics Upload and Display

## Problem
The admin Graphics page currently routes ALL operations (list, upload, update, delete) through your external VPS API at `api.theislandofone.com`. When that API is unreachable or returns errors, the page shows "No graphics yet" and uploads fail. Your database already has 12 graphics stored.

## Solution
Switch the admin Graphics page to work directly with Lovable Cloud (database + file storage) instead of the VPS. This makes it fully self-contained and reliable.

## Changes

### 1. Database: Add admin SELECT policy
Currently only active graphics are visible via the database. Admins need to see all graphics (including drafts).
- Add RLS policy: "Admins can view all graphics" for SELECT using `has_role(auth.uid(), 'admin')`

### 2. Rewrite `AdminGraphics.tsx` to use Lovable Cloud directly
- Remove all `api.get/post/put/delete` VPS calls
- **Fetch**: Use `supabase.from("graphics").select("*").order("sort_order")` (admin RLS policy returns all, including inactive)
- **Upload**: Upload image files to the existing `graphics` storage bucket, then insert a row with the public URL
- **Update**: Use `supabase.from("graphics").update(...)` 
- **Delete**: Use `supabase.from("graphics").delete()` and remove the file from storage
- Remove the `fetchAll` / `allGraphics` / `loadingAll` state -- use `useGraphics` pattern with admin query instead

### 3. Update `useGraphics.ts` (optional admin variant)
Add an `useAdminGraphics` hook that queries all graphics (not just active) using the Supabase client directly, removing the VPS dependency.

## What stays the same
- The public `useGraphics` hook continues to work for the storefront
- The resize dialog and UI layout remain unchanged
- The `graphics` storage bucket already exists and is public

## Technical notes
- The `graphics` storage bucket is already created and public
- RLS policies for storage may need to be added to allow admin uploads
- The admin must be logged in with a user that has the `admin` role for RLS to work
