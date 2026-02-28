

## Plan: Fix Issues 1, 1B, 2, 3, and 4

### Issue 1 & 1B — Invite Link System

**Root cause**: The `create-invite` function returns a Supabase function URL as `share_url`, which some email/SMS clients render as raw HTML. The `share-invite` edge function also has deployment issues.

**Fix**:

1. **Add `/i/:code` route** in `src/App.tsx` — a new `InviteRedirect` page component
2. **Create `src/pages/InviteRedirect.tsx`** — renders a proper HTML page with:
   - OG meta tags via `react-helmet` pattern (document.title + meta injection via useEffect)
   - A visible branded landing page (not raw HTML)
   - Meta refresh redirect + visible "Continue" button + JS redirect as enhancement
   - Email input for users who arrive without being logged in → calls `redeem-invite` after auth
   - Validates invite code via a new lightweight edge function call or direct DB query
3. **Update `supabase/functions/create-invite/index.ts`** — change `share_url` to use `https://theislandofone.com/i/{code}` instead of the Supabase function URL
4. **Fix `supabase/functions/text-to-speech/index.ts`** auth — replace `getClaims(token)` with `getUser(token)` since `getClaims` doesn't exist on supabase-js v2 (this is actually Issue 2's root cause, listed here for completeness)

### Issue 2 — Audio Generation "Load failed"

**Root causes**:
- `useAudioGeneration.ts` calls `api.post("/api/text-to-speech")` which hits the VPS API (`VITE_API_URL`), not the Supabase edge function — this fails with CORS/404
- `text-to-speech` edge function uses `supabaseClient.auth.getClaims(token)` which doesn't exist in supabase-js v2, causing a runtime error

**Fix**:
1. **Fix `supabase/functions/text-to-speech/index.ts`** — replace `getClaims` with `getUser` for auth validation
2. **Fix `src/hooks/useAudioGeneration.ts`** — replace `api.post` call with direct `fetch` to the Supabase edge function (matching the pattern already used in `AdminAudiobooks.tsx`)
3. **Redeploy** the `text-to-speech` edge function

### Issue 3 — Apple Books Link

**Fix**: In `src/pages/admin/AdminPublisher.tsx` line 192, change `https://authors.apple.com` to `https://authors.apple.com/epub-upload`

### Issue 4 — Sample EPUB + False 404

**Fix**:
1. **Add `exportSampleEpub` function** to `src/lib/bookExport.ts` — generates a sample EPUB containing only the Preface chapter (first chapter), with "(Sample)" appended to title metadata, filename includes "sample"
2. **Add "Download Sample" button** in `AdminPublisher.tsx` PlatformCard under the existing "Download EPUB" button
3. **Fix false 404**: The current `exportBookToEpub` uses `triggerDownload` which works fine — the 404 likely comes from the toast in the catch block firing incorrectly. Will verify and ensure errors only surface on actual failures.

### Files to modify:
- `src/App.tsx` — add `/i/:code` route
- `src/pages/InviteRedirect.tsx` — new file, invite landing page
- `supabase/functions/create-invite/index.ts` — fix share_url domain
- `supabase/functions/text-to-speech/index.ts` — fix getClaims → getUser
- `src/hooks/useAudioGeneration.ts` — fix to call Supabase edge function
- `src/pages/admin/AdminPublisher.tsx` — Apple link + sample button
- `src/lib/bookExport.ts` — add `exportSampleEpub`

