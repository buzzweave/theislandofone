

# Fix: "Apply Plan" Blocked by Empty `allowed_folders` Setting

## Problem

When clicking "Apply Plan" in the AI Developer dashboard, the edge function throws:

```
Path validation failed: allowedPaths is empty -- Apply blocked
```

The `ai_dev_settings` table has `allowed_folders` set to an empty string. The `validatePaths` function (line 27-28) intentionally blocks all apply/deploy operations when no allowed folders are configured, as a safety measure.

## Root Cause

The setting `allowed_folders` in the database is blank. This was designed as a safety gate -- without explicit folder permissions, no plan can be applied. But the Settings page doesn't make it obvious that this must be configured first.

## Solution

Two changes:

### 1. Seed `allowed_folders` with a sensible default

Update the `allowed_folders` setting in the database to a reasonable default value that covers the typical project structure:

```
src, public, supabase/functions
```

This allows plans to modify source code, public assets, and edge functions while the existing `forbidden_folders` list still blocks `.env`, `config`, `secrets`, `auth`, `billing`, and `payments`.

### 2. Add a visible warning in the Settings page

Update `AIDevSettings.tsx` to show a warning banner when `allowed_folders` is empty, so the admin knows this must be configured before plans can be applied.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/admin/ai-developer/AIDevSettings.tsx` | Add warning when allowed_folders is empty |

## Database Change

Update `ai_dev_settings` to set `allowed_folders` to `src, public, supabase/functions`.

## Implementation Order

1. Update the database setting with a default value
2. Add the warning UI to the Settings page
3. Test applying a plan again

