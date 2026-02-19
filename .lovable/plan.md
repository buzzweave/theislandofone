
# Backend Stabilization -- Surgical Fixes Only

**Estimated credits: 5-7 messages total**

---

## Batch 1 (1 message): Migrate Content Hooks to Database

**The root cause of issues #1-5** is that `useSermons`, `useBooks`, and `useVideos` all call the external VPS API (`api.theislandofone.com`) via `src/lib/api.ts`. The database tables already exist with correct schemas, defaults, and RLS policies. The fix is to rewrite these three hooks to use the database client directly.

| File | Change |
|------|--------|
| `src/hooks/useSermons.ts` | Replace all VPS `api.get/post/put/delete` calls with `supabase.from("sermons")` queries |
| `src/hooks/useBooks.ts` | Replace VPS calls with `supabase.from("books")` and `supabase.from("book_chapters")` queries |
| `src/hooks/useVideos.ts` | Replace VPS calls with `supabase.from("videos")` queries |

This single change fixes:
- Cannot create sermons (issue #1)
- Cannot create books (issue #2)
- Cannot publish videos (issue #3)
- Unknown price field error (issue #4) -- DB defaults price to 0, is_free to true
- SQL syntax errors in books (issue #5) -- eliminates VPS as middleman

---

## Batch 2 (1 message): Analytics + Navbar + Signup Redirect

| File | Change |
|------|--------|
| `src/pages/admin/AdminAnalytics.tsx` | Replace static `content.ts` imports with real DB counts from `useSermons`, `useVideos`, and a new members count query |
| `src/components/Layout.tsx` | Change "Join" to "Sign Up" for logged-out users (lines 112-115); change "Join" to "Membership" for logged-in users (lines 91-93); same for mobile menu (lines 157-163) |
| `src/pages/Auth.tsx` | After successful signup, redirect to `/membership` instead of the previous page |

---

## Batch 3 (1 message): Comments + Ratings Tables and Components

- Database migration: Create `comments` and `ratings` tables with RLS (authenticated users can insert/read own, anyone can read)
- Create `src/components/CommentsSection.tsx` -- reusable comment list + form
- Create `src/components/StarRating.tsx` -- 5-star rating with one-per-user enforcement
- Add both components to `BlogPost.tsx`, `SermonDetail.tsx`, `BookDetail.tsx`

---

## Batch 4 (1 message): Edge Function Fixes

| Function | Fix |
|----------|-----|
| `send-notification` | Add retry logic (up to 2 retries with 1s delay) for Resend API calls; improve error logging |
| `text-to-speech` | Add explicit check that `OPENAI_API_KEY` is loaded before attempting generation; improve auth error messages |
| `share-blog` | Improve fallback: if `image_url` is empty, use a high-quality default image URL instead of the logo |

---

## Batch 5 (1 message): SEO + OG + EPUB Fixes

| Item | Change |
|------|--------|
| SEO: sitemap | Create `supabase/functions/sitemap/index.ts` edge function that queries published blogs, books, sermons and returns XML sitemap |
| SEO: JSON-LD | Add structured data script tags to `BlogPost.tsx`, `SermonDetail.tsx`, `BookDetail.tsx` |
| EPUB fix | Review and fix `src/lib/bookExport.ts` storage path and signed URL logic for the download flow |

---

## Batch 6 (1 message): Inner Circle Pricing + AI Sidebar + Remaining

| Item | Change |
|------|--------|
| Inner Circle price | Update `src/lib/stripe.ts` to $26.95; update `membership_plans` table row |
| Inner Circle gating | Already working via `access_tiers` + `check-subscription` -- no code changes needed, just confirm |
| AI Sidebar | Add error handling and fallback messaging in `AISidebar.tsx` for auth failures |
| Member passwords | Not possible to set passwords for other users securely -- the current flow (admin adds email, user signs up with their own password) is the correct approach |

---

## Items That Require Your Action (Not Code Changes)

- **Resend emails**: You must verify a sender domain in your Resend dashboard. Using `onboarding@resend.dev` only sends to your own account email.
- **Inner Circle Stripe price**: You need to create a new $26.95/month price in your Stripe dashboard and provide the new price ID. I will update `stripe.ts` with the current constant for now.
- **Site visitor tracking / page views / referrers**: These require a third-party analytics service (Google Analytics, Plausible, etc.) -- there is no built-in way to track page views in the database without significant infrastructure. I can add a simple page-view counter table if you want approximate numbers.

---

## Summary

| Batch | Credits | What Gets Fixed |
|-------|---------|-----------------|
| 1 | 1 | Sermons, Books, Videos creation/editing/publishing |
| 2 | 1 | Analytics real data, Navbar text, Signup redirect |
| 3 | 1 | Comments + Ratings on blogs/sermons/books |
| 4 | 1 | Email retry, Audiobook auth, OG image fallback |
| 5 | 1 | Sitemap, JSON-LD, EPUB download fix |
| 6 | 1 | Inner Circle pricing, AI sidebar, final validation |
| **Total** | **~6** | |
