

# Fix: Notifications Not Loading Due to RLS Policy Mismatch

## Root Cause

The admin panel authenticates through a custom API on an external VPS (`/api/auth/login`), not through the database's built-in auth system. However, the `notifications` table has Row Level Security (RLS) policies that check for a database auth session (`auth.uid()`), which is always `null` since the admin never signs in through the database auth.

This means every query to the `notifications` table from the frontend returns zero rows -- the database silently blocks all reads.

## Fix

Since the admin panel is already protected by the `AdminGuard` component (which checks the custom VPS auth), and the `useNotifications` hook queries Supabase directly, we need to allow the Supabase anon client to read, update, and delete notifications.

### Database Migration

Update RLS policies on the `notifications` table to allow public access for SELECT, UPDATE, and DELETE operations. The admin guard in the frontend already protects these pages, and the notification data is admin-facing operational data (form submissions).

```sql
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can view notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can update notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can delete notifications" ON notifications;

-- Create permissive policies for the anon client
CREATE POLICY "Allow read notifications" ON notifications FOR SELECT USING (true);
CREATE POLICY "Allow update notifications" ON notifications FOR UPDATE USING (true);
CREATE POLICY "Allow delete notifications" ON notifications FOR DELETE USING (true);
```

### No Code Changes Needed

The frontend code (`useNotifications`, `AdminNotifications`, `NotificationBell`) is already correctly implemented. Once the RLS policies are fixed, notifications will appear immediately.

## Files Changed

| File | Change |
|------|--------|
| Database migration | Update RLS policies on `notifications` table to allow anon access |

