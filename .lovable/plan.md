

## Problem

The `share-invite` edge function deploys successfully but returns 404 when called. The code, config, and database are all correct. This is a known deployment issue where the function needs a code-level change to trigger a fresh build.

## Root Cause

The deployment system may have cached a failed build. A trivial code change forces a new build artifact.

## Fix

1. **Add a version comment** to `supabase/functions/share-invite/index.ts` (line 1) to force a fresh deploy:
   ```typescript
   // v2 – force redeploy
   ```

2. **Redeploy** the function after the change.

3. **Verify** by calling the URL again.

This is a single-line, non-functional change that will force the build system to create a new deployment.

