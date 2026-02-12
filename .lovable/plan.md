

# Replace Backend with MySQL + Custom REST API

## Overview

This plan replaces all Supabase dependencies in your frontend with a single API client that talks to your own Node.js REST API on your VPS. Your API will handle MySQL database operations, file storage, and authentication using JWT tokens.

**Important**: I will rewrite the frontend code inside Lovable. You will need to build the Node.js API server separately on your VPS -- I will provide the full API specification and a starter server file so you know exactly what endpoints to create.

---

## What Gets Created / Changed

### 1. New API Client (`src/lib/api.ts`)

A single file replacing the Supabase client. It will:
- Use `fetch` to call your VPS API at a configurable base URL (set via `VITE_API_URL`)
- Attach JWT tokens from localStorage to every request
- Handle file uploads via `multipart/form-data`
- Provide typed helper methods: `api.get()`, `api.post()`, `api.put()`, `api.delete()`, `api.upload()`

### 2. New Auth Context (`src/contexts/AdminAuthContext.tsx`)

Replace Supabase Auth with your own JWT flow:
- `POST /api/auth/login` sends email + password, receives a JWT token
- Token stored in localStorage, attached to all requests
- `POST /api/auth/forgot-password` for reset flow
- Session refresh via `POST /api/auth/refresh`
- Keep existing CAPTCHA and brute-force lockout (client-side logic stays the same)

### 3. Rewrite All Data Hooks (8 files)

Each hook will switch from `supabase.from("table")` to `api.get("/table")` etc:

| Hook File | Endpoints Needed |
|---|---|
| `useBooks.ts` | `GET/POST/PUT/DELETE /api/books`, `PUT /api/books/:id/chapters` |
| `useSermons.ts` | `GET/POST/PUT/DELETE /api/sermons` |
| `useVideos.ts` | `GET/POST/PUT/DELETE /api/videos` |
| `useBlogPosts.ts` | `GET/POST/PUT/DELETE /api/blog-posts` |
| `useHeroBanners.ts` | `GET /api/hero-banners` |
| `useMembershipPlans.ts` | `GET /api/membership-plans` |
| `useGraphics.ts` | `GET /api/graphics` |
| `useSiteSettings.ts` | `GET/PUT /api/site-settings/:key` |
| `useSiteLogo.ts` | `GET/PUT /api/site-settings/logo_url` |

### 4. Rewrite All Admin Pages with Direct Supabase Calls (6 files)

Several admin pages call Supabase directly (not through hooks) for CRUD and file uploads:

- **AdminHeroBanners.tsx** -- banner CRUD + image uploads to `/api/upload`
- **AdminGraphics.tsx** -- graphics CRUD + file uploads
- **AdminBlogManager.tsx** -- blog image uploads
- **AdminVideoManager.tsx** -- thumbnail uploads
- **AdminBookEditor.tsx** -- cover image + PDF uploads
- **AdminMembershipPlans.tsx** -- plan CRUD
- **AdminLogin.tsx** -- auth calls

### 5. Rewrite Public Pages with Direct Supabase Calls (2 files)

- **Speaking.tsx** -- `POST /api/speaking-requests`
- **BlogPost.tsx** -- `GET /api/blog-posts/:slug`

### 6. Rewrite Edge Function Callers (2 files)

- **useAudioGeneration.ts** -- call `POST /api/text-to-speech` on your VPS instead of Supabase edge function
- **PdfUploadButton.tsx** -- call `POST /api/parse-pdf` on your VPS

### 7. New API Server Specification File (`API_SPECIFICATION.md`)

A complete reference document you can use to build your Node.js/Express server, covering:
- All endpoints with request/response shapes
- MySQL table schemas (translated from the current Postgres schema)
- JWT auth middleware pattern
- File upload handling (multer + local disk or S3)
- Endpoint logic for AI writing, TTS, and PDF parsing (proxying to external APIs)

### 8. Remove Supabase References

- Stop importing from `@/integrations/supabase/client`
- The `src/integrations/supabase/` folder and edge functions (`supabase/functions/`) will remain in the repo but become unused (safe to delete after migration)

---

## Environment Variable

One new env var replaces all Supabase vars:

```
VITE_API_URL=https://api.theislandofone.com
```

You will point this to your VPS API server.

---

## MySQL Schema (provided in API_SPECIFICATION.md)

All 10 tables translated from Postgres to MySQL, including:
- `books`, `book_chapters`, `sermons`, `videos`, `blog_posts`
- `hero_banners`, `membership_plans`, `graphics`, `speaking_requests`
- `site_settings`, `users`, `user_roles`

UUID primary keys, proper indexes, and foreign keys preserved.

---

## What You Need to Build on Your VPS

1. **Node.js/Express API** with the endpoints listed above
2. **MySQL database** with the schema provided
3. **JWT authentication** (bcrypt for passwords, jsonwebtoken for tokens)
4. **File storage** -- serve uploads from a local `/uploads` directory or S3
5. **Proxy endpoints** for AI writing (OpenAI/Gemini), TTS (ElevenLabs), and PDF parsing

---

## Files Modified (total: ~20 files)

- `src/lib/api.ts` (new)
- `API_SPECIFICATION.md` (new)
- `src/contexts/AdminAuthContext.tsx`
- `src/hooks/useBooks.ts`
- `src/hooks/useSermons.ts`
- `src/hooks/useVideos.ts`
- `src/hooks/useBlogPosts.ts`
- `src/hooks/useHeroBanners.ts`
- `src/hooks/useMembershipPlans.ts`
- `src/hooks/useGraphics.ts`
- `src/hooks/useSiteSettings.ts`
- `src/hooks/useSiteLogo.ts`
- `src/hooks/useAudioGeneration.ts`
- `src/components/admin/PdfUploadButton.tsx`
- `src/pages/admin/AdminHeroBanners.tsx`
- `src/pages/admin/AdminGraphics.tsx`
- `src/pages/admin/AdminBlogManager.tsx`
- `src/pages/admin/AdminVideoManager.tsx`
- `src/pages/admin/AdminBookEditor.tsx`
- `src/pages/admin/AdminMembershipPlans.tsx`
- `src/pages/admin/AdminLogin.tsx`
- `src/pages/Speaking.tsx`
- `src/pages/BlogPost.tsx`

## Important Note

After this migration, the app will NOT work with Lovable's preview until you have your VPS API running. You will need to export the code to GitHub and run it locally or deploy to your VPS to test.

