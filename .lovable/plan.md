

# Fix "Failed to fetch" on Unpublish

## Root Cause
The `graphics-admin` edge function's CORS headers do not include `Access-Control-Allow-Methods`. When the browser sends a preflight (OPTIONS) request for a PUT call (used by Unpublish), the response lacks the required `Access-Control-Allow-Methods` header, so the browser blocks the actual request entirely -- resulting in a "Failed to fetch" error.

## Fix

### Update `supabase/functions/graphics-admin/index.ts`
Add the missing `Access-Control-Allow-Methods` header to the CORS configuration:

```
Before:
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",

After:
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
```

This is a one-line addition to the existing CORS headers object. No other files need to change.

