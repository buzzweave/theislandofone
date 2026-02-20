

# Fix: AI Developer Dashboard "Invalid Token" Errors

## Problem

The AI Developer dashboard fires 5 parallel calls to the `ai-dev-operator` edge function on mount. Every call fails with "Invalid token" because:

- The admin login system authenticates via the VPS API (`api.theislandofone.com/api/auth/login`) and stores a VPS JWT
- The edge function `verifyAdmin` expects a **Supabase auth session token**
- `supabase.functions.invoke()` sends the Supabase session (which is empty/invalid since the admin never logged into Supabase auth)
- Result: every call throws "Invalid token" at line 112

## Solution

Update `verifyAdmin` in the edge function to accept the VPS admin token as a fallback authentication method. This requires a shared secret approach:

### Option A: Shared Admin Secret (Recommended -- simplest)

Add an `AI_DEV_ADMIN_TOKEN` secret. The frontend sends this token (stored in the VPS session or as a config value) alongside calls. The edge function checks:

1. First, try Supabase auth (existing flow)
2. If that fails, check for a custom `x-admin-token` header against the stored secret

### Option B: Proxy through VPS API

Route all `ai-dev-operator` calls through the VPS backend (`api.theislandofone.com/api/ai-dev/...`), which already has the admin session. The VPS then calls the edge function with the service-role key.

### Option C: Dual Login (add Supabase auth for admins)

Have the admin login also create a Supabase auth session. This is the most architecturally clean but requires the most changes (adding Supabase credentials for admin users).

---

## Recommended Implementation: Option A

### 1. Add Secret

Add an `AI_DEV_ADMIN_TOKEN` secret -- a strong random string that serves as a shared key between the VPS admin panel and the edge function.

### 2. Edge Function (`supabase/functions/ai-dev-operator/index.ts`)

Update `verifyAdmin` to support both auth methods:

```text
async function verifyAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  const adminToken = req.headers.get("x-admin-token");

  // Method 1: Supabase auth token (existing)
  if (authHeader) {
    try {
      const token = authHeader.replace("Bearer ", "");
      // ... existing Supabase user + role check ...
      return { user, serviceClient };
    } catch { /* fall through to method 2 */ }
  }

  // Method 2: Shared admin token
  const expectedToken = Deno.env.get("AI_DEV_ADMIN_TOKEN");
  if (expectedToken && adminToken === expectedToken) {
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    return { user: { id: "admin-token-user" }, serviceClient };
  }

  throw new Error("Invalid token");
}
```

### 3. Frontend Hook (`src/hooks/useAIDev.ts`)

Update `invokeAIDev` to include the admin token header. The token can be read from the VPS session or stored in a known location (e.g., environment variable or fetched from the VPS on admin login).

Two sub-options:
- **3a**: Store `AI_DEV_ADMIN_TOKEN` as a `VITE_` env var (simple but less secure since it's in the client bundle)
- **3b**: Have the VPS login endpoint return the AI dev token as part of the session, store it in the admin auth context, and pass it to `invokeAIDev`

### 4. Dashboard (`AIDevDashboard.tsx`)

No changes needed -- once auth works, the existing 5 parallel calls will succeed.

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/ai-dev-operator/index.ts` | Update `verifyAdmin` to accept `x-admin-token` header as fallback |
| `src/hooks/useAIDev.ts` | Pass admin token header in `invokeAIDev` |
| Secret: `AI_DEV_ADMIN_TOKEN` | New secret to add |

## Implementation Order

1. Add `AI_DEV_ADMIN_TOKEN` secret
2. Update edge function `verifyAdmin`
3. Deploy edge function
4. Update `useAIDev.ts` to send the token
5. Test dashboard loads without errors

