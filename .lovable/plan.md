
# Fix: Admin Auth Must Use Database Authentication

## Problem
The database logs show repeated errors: **"new row violates row-level security policy"** for both `sermons` and `books` tables.

The hooks (useSermons, useBooks, useVideos) were correctly migrated to use the database in the last batch. However, the **admin login still authenticates against the old external VPS API** instead of the database authentication system. This means when an admin tries to create/edit/delete content, the database sees no authenticated user and blocks the operation.

Your admin account (`support@buzzweave.com`) already exists in the database with the `admin` role -- it just needs the login flow to actually use it.

## Fix (1 file change)

Rewrite `src/contexts/AdminAuthContext.tsx` to use `supabase.auth.signInWithPassword()` instead of the VPS API calls. This is a surgical change to the authentication flow only -- no UI changes.

### What changes:
- **Login**: Use `supabase.auth.signInWithPassword({ email, password })` instead of `api.post("/api/auth/login")`
- **Session check**: Use `supabase.auth.getSession()` and `supabase.auth.onAuthStateChange()` instead of `api.get("/api/auth/me")`
- **Logout**: Use `supabase.auth.signOut()` instead of `api.clearToken()`
- **Token refresh**: Remove manual refresh interval (Supabase handles this automatically)
- **Admin verification**: After login, check that the user has the `admin` role in `user_roles` table. If not, sign them out and reject login.

### What stays the same:
- All UI components (AdminLogin.tsx, AdminLayout.tsx, etc.) remain untouched
- The `useAdminAuth()` hook interface stays identical
- Failed attempts tracking and lockout logic preserved
- CAPTCHA on login page preserved

## Technical Detail

```text
Current flow (broken):
  AdminLogin -> VPS API login -> VPS token stored -> hooks use Supabase client (no session) -> RLS BLOCKS

Fixed flow:
  AdminLogin -> Supabase auth login -> Supabase session active -> hooks use Supabase client (has session) -> RLS PASSES
```

## Estimated credits: 1
