

# Fix Graphics Section -- Switch to Lovable Cloud Backend

## Problem
The graphics section on the homepage and public `/graphics` page are blank because the `useGraphics` hook fetches from the external VPS API, which returns an empty array. The graphics data is not synced with the Lovable Cloud database, which has a `graphics` table ready but contains no records.

## Solution
Switch the graphics system to use the Lovable Cloud database directly (like the existing `graphics` table with proper security policies already in place). This will make uploads, management, and public display all work through the same data layer.

## Changes

### 1. Rewrite `src/hooks/useGraphics.ts`
- Replace the VPS API call with a direct database query using the Supabase client.
- Add mutation hooks for create, update, and delete operations (matching the pattern used in `useBooks.ts` and `useSermons.ts`).
- The public query will automatically only return `is_active = true` graphics due to existing Row-Level Security policies.
- Add a separate `useAllGraphics` hook for the admin that fetches all graphics (active and inactive) using the Supabase client with auth context.

### 2. Update `src/pages/admin/AdminGraphics.tsx`
- Replace all `api.post`, `api.put`, `api.delete` calls with the new Supabase-backed mutation hooks.
- Replace the `api.upload` calls with direct Supabase Storage uploads to the existing `graphics` bucket (already public).
- The file upload flow (preview image + download file) will upload to the `graphics` storage bucket and store the resulting public URLs in the database.

### 3. Update `src/pages/Graphics.tsx`
- No structural changes needed. The `useGraphics` hook switch will automatically populate the public gallery since the data will come from the database where `is_active = true` records are returned.

### 4. Update `src/pages/Index.tsx`
- No changes needed. The homepage already references `useGraphics` and conditionally renders the section when `graphics.length > 0`. Once data flows from the database, this section will appear automatically.

## Technical Details

- **Storage**: Files upload to the existing `graphics` Supabase Storage bucket (already public).
- **Security**: The `graphics` table already has RLS policies:
  - Public users can only SELECT where `is_active = true`
  - Admin users (with `admin` role) can INSERT, UPDATE, DELETE, and SELECT all records
- **Admin auth**: The admin panel uses a custom JWT auth system (`admin_token` in localStorage). Since the Supabase `graphics` table RLS requires Supabase Auth admin role, the admin CRUD operations will need to use the Supabase client. If the admin is not authenticated via Supabase Auth, we will either use a service-role approach via an edge function or adjust the RLS to allow public inserts with a different mechanism. The most practical approach is to create a small edge function for admin graphics CRUD that validates the admin token and uses the service role key internally.

### Alternative (simpler) approach for admin writes:
Since the existing admin system uses a custom JWT (not Supabase Auth), the simplest path is:
- **Public reads**: Use the Supabase client directly (RLS allows `is_active = true` reads for anonymous users).
- **Admin writes**: Keep using the VPS API for create/update/delete operations, OR create a backend function that handles admin CRUD with the service role.

Given the existing architecture, the cleanest approach is:
1. Switch **reads** (both public and admin) to Supabase.
2. Create a backend function `graphics-admin` that handles uploads and CRUD using the service role, validating the admin token from the VPS auth system.

This ensures data consistency while preserving the existing admin authentication flow.

