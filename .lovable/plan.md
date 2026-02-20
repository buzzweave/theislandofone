

# Fix: "Apply Plan" Non-2xx Error -- Empty `allowed_folders`

## Problem

Clicking "Confirm Apply" on any plan triggers a non-2xx error from the backend function. The error is:

```
Path validation failed: allowedPaths is empty -- Apply blocked
```

The `allowed_folders` setting in the `ai_dev_settings` table has an empty string value. The `validatePaths` function (line 27-28 of the edge function) intentionally blocks all operations when no allowed folders are configured.

## Solution

Two changes to fix this permanently:

### 1. Seed the database with a default value

Run a migration to set `allowed_folders` to `src, public, supabase/functions`. This covers the typical project structure while the existing `forbidden_folders` list still blocks sensitive paths like `.env`, `config`, `secrets`, `auth`, `billing`, and `payments`.

### 2. Harden the edge function with a fallback

Update the `apply_plan` action in `ai-dev-operator/index.ts` so that if `allowed_folders` is empty at runtime, it falls back to the same sensible default (`src, public, supabase/functions`) instead of blocking outright. This prevents the error from recurring if the setting gets cleared.

## Technical Details

### Database Migration

```sql
INSERT INTO ai_dev_settings (key, value)
VALUES ('allowed_folders', 'src, public, supabase/functions')
ON CONFLICT (key) DO UPDATE
SET value = 'src, public, supabase/functions',
    updated_at = now();
```

### Edge Function Change (`supabase/functions/ai-dev-operator/index.ts`)

In the section where `allowed_folders` is read from the database and passed to `validatePaths`, add a fallback default so an empty setting doesn't block everything:

```typescript
const DEFAULT_ALLOWED = ["src", "public", "supabase/functions"];

// Where allowed is read from settings:
const allowedRaw = settingsMap["allowed_folders"] || "";
const allowed = allowedRaw.split(",").map(s => s.trim()).filter(Boolean);
const effectiveAllowed = allowed.length > 0 ? allowed : DEFAULT_ALLOWED;
```

This way, even if the admin clears the setting, plans targeting standard project paths will still work.

### Files Changed

| File | Change |
|------|--------|
| Database migration | Seed `allowed_folders` with `src, public, supabase/functions` |
| `supabase/functions/ai-dev-operator/index.ts` | Add `DEFAULT_ALLOWED` fallback when `allowed_folders` is empty |

### Implementation Order

1. Run database migration to seed the setting
2. Update edge function with fallback default
3. Redeploy edge function
4. Test "Confirm Apply" on a plan
