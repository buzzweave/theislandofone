

# Revert All Content + Admin Auth to VPS API

Restore sermons, books, graphics, blog, videos, and admin authentication to use your VPS API at `api.theislandofone.com` so all content creation and management works through your server.

## Changes Summary

| # | File | Change |
|---|------|--------|
| 1 | `src/contexts/AdminAuthContext.tsx` | Revert auth from database auth back to VPS API (`api.post("/api/auth/login")`, token refresh, `api.get("/api/auth/me")`) |
| 2 | `src/hooks/useSermons.ts` | Replace all database queries with VPS API calls (`api.get/post/put/delete("/api/sermons/...")`) |
| 3 | `src/hooks/useBooks.ts` | Replace database queries with VPS API calls; remove `useUpsertChapters` (VPS handles chapters inside book object) |
| 4 | `src/hooks/useBlogPosts.ts` | Replace database queries with VPS API calls (`api.get/post/put/delete("/api/blog/...")`) |
| 5 | `src/hooks/useGraphics.ts` | Replace database query with VPS API call (`api.get("/api/graphics")`) |
| 6 | `src/hooks/useVideos.ts` | Replace database queries with VPS API calls (`api.get/post/put/delete("/api/videos/...")`) |
| 7 | `src/pages/admin/AdminGraphics.tsx` | Replace edge function calls with VPS API calls (`api.get/post/put/delete("/api/graphics/...")`) |
| 8 | `src/pages/admin/AdminBookEditor.tsx` | Remove `useUpsertChapters`; save chapters as part of book body via VPS; keep `api.upload` for file uploads |

## Technical Details

### Admin Auth (file 1)
- Login: `api.post("/api/auth/login", { email, password })` stores token via `api.setToken()`
- Session check on mount: `api.get("/api/auth/me")` with stored token
- Token refresh: `api.post("/api/auth/refresh")` every 4 minutes while authenticated
- Logout: `api.clearToken()`
- Forgot password: `api.post("/api/auth/forgot-password", { email })`
- Remove `checkAdminRole`, database auth imports, and `onAuthStateChange` listener

### Content Hooks (files 2-6)
All follow the same REST pattern using the `api` client from `src/lib/api.ts`:
```text
List:    api.get("/api/{resource}")
Single:  api.get("/api/{resource}/{id}")
Create:  api.post("/api/{resource}", body)
Update:  api.put("/api/{resource}/{id}", body)
Delete:  api.delete("/api/{resource}/{id}")
```

### Books (file 3 + 8)
- VPS returns chapters embedded in the book object (no separate `book_chapters` table queries)
- `useUpsertChapters` is removed entirely
- `AdminBookEditor.tsx` save sends `{ ...bookData, chapters }` to `api.put("/api/books/{id}", body)`

### Graphics Admin (file 7)
- Remove `adminApi()` helper and `getAdminToken()` functions
- Fetch all (including inactive): `api.get("/api/graphics/admin")`
- Create with file upload: `api.uploadMultiple("/api/graphics", { preview, file })`
- Update: `api.put("/api/graphics/{id}", body)`
- Delete: `api.delete("/api/graphics/{id}")`

### What Stays the Same
- `src/lib/api.ts` -- already correct, pointing to `VITE_API_URL`
- All admin UI layouts -- no visual changes
- Blog image uploads via storage bucket (ImageUploader in AdminBlogManager stays as-is)
- Blog sync from VPS feature stays as-is
- Database tables remain in place

