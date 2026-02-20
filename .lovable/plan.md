
# Fix: AI Developer Dashboard "Invalid Token" Errors — RESOLVED

## What was done

1. **Added `AI_DEV_ADMIN_TOKEN` secret** — stored securely for fallback auth
2. **Updated `verifyAdmin` in edge function** — now supports 3 auth methods:
   - Method 1: Supabase auth token (existing)
   - Method 2: VPS admin JWT — validates by calling `api.theislandofone.com/api/auth/me`
   - Method 3: Shared `AI_DEV_ADMIN_TOKEN` secret via `x-admin-secret` header
3. **Updated `useAIDev.ts`** — sends the VPS admin JWT from localStorage as `x-admin-token` header
4. **Deployed edge function** — live and ready

## How it works

When the admin logs in via the VPS API, the JWT is stored in `localStorage("admin_token")`. The `useAIDev` hook reads this token and passes it as `x-admin-token` header. The edge function validates it against the VPS `/api/auth/me` endpoint. If valid, the request proceeds with a service-role client.
