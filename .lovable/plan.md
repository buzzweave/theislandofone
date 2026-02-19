
# Add Forgot Password Flow

## What This Does
Adds a "Forgot your password?" link on the sign-in form and a dedicated `/reset-password` page where users can set a new password after clicking the email link.

## Changes

### 1. Update Auth page (`src/pages/Auth.tsx`)
- Add a "Forgot your password?" button/link below the Sign In button
- Clicking it shows inline UI (or toggles state) with an email input and "Send Reset Link" button
- Calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })`
- Shows a success toast confirming the email was sent

### 2. Create Reset Password page (`src/pages/ResetPassword.tsx`)
- New page at `/reset-password`
- Detects `type=recovery` in the URL hash (set automatically by the email link)
- Shows a form with "New Password" and "Confirm Password" fields
- Calls `supabase.auth.updateUser({ password })` to save the new password
- On success, redirects to home page with a success toast

### 3. Add route in `src/App.tsx`
- Add `<Route path="/reset-password" element={<Layout><ResetPassword /></Layout>} />` alongside the other public routes

## Technical Details

| File | Change |
|------|--------|
| `src/pages/Auth.tsx` | Add "Forgot your password?" link with inline reset email form |
| `src/pages/ResetPassword.tsx` | New page -- password reset form that reads recovery token from URL hash |
| `src/App.tsx` | Add `/reset-password` route |

No database changes required. Uses the built-in authentication password reset flow.
