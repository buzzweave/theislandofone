

# Community Forum and Ministry Support Group - Implementation Plan

## Overview

Build two membership-gated discussion areas under `/community`:
- **Community Forum** -- accessible to Reader tier and above
- **Ministry Support Group** -- accessible to Pastor tier and above

## Database Changes (1 migration)

### New Tables

**forum_categories**
- `id` (uuid, PK, default gen_random_uuid())
- `name` (text, not null)
- `description` (text, default '')
- `slug` (text, unique, not null)
- `tier_required` (text, default 'reader')
- `sort_order` (int, default 0)
- `created_at` (timestamptz, default now())

**forum_posts**
- `id` (uuid, PK, default gen_random_uuid())
- `category_id` (uuid, FK -> forum_categories, on delete cascade)
- `user_id` (uuid, not null)
- `author_name` (text, not null)
- `title` (text, not null)
- `content` (text, not null)
- `is_pinned` (boolean, default false)
- `is_locked` (boolean, default false)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

**forum_replies**
- `id` (uuid, PK, default gen_random_uuid())
- `post_id` (uuid, FK -> forum_posts, on delete cascade)
- `user_id` (uuid, not null)
- `author_name` (text, not null)
- `content` (text, not null)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### RLS Policies
- Categories: SELECT for all authenticated users
- Posts/Replies: SELECT for authenticated, INSERT where auth.uid() = user_id, UPDATE/DELETE where auth.uid() = user_id
- Admins get full access on all three tables

### Seed Data (6 categories)
- General Discussion (reader)
- Prayer Requests (reader)
- Bible Study (reader)
- Ministry Questions (pastor)
- Pastor Resources (pastor)
- Leadership Support (pastor)

## New Files

| File | Purpose |
|------|---------|
| `src/pages/Community.tsx` | Main forum landing -- shows categories grouped by tier |
| `src/pages/ForumCategory.tsx` | Thread listing for a single category |
| `src/pages/ForumThread.tsx` | Single thread with replies |
| `src/hooks/useForum.ts` | React Query hooks for all forum CRUD |
| `src/components/forum/TierGate.tsx` | Membership gate -- shows upgrade prompt if tier insufficient |

## Modified Files

| File | Change |
|------|--------|
| `src/App.tsx` | Add 3 routes: `/community`, `/community/:slug`, `/community/:slug/:postId` |
| `src/components/Layout.tsx` | Add "Community" to navLinks array |

## User Flow

1. Click "Community" in navigation
2. If not logged in, redirected to `/auth`
3. See categories split into Community Forum and Ministry Support Group sections
4. Pastor-tier categories show lock/upgrade prompt for Reader-tier users
5. Click a category to see threads (pinned first, then newest)
6. Create new threads or reply to existing ones
7. Edit or delete own posts/replies

## Tier Gating Logic

Uses existing `getTierByProductId` and `tierHasAccess` from `src/lib/stripe.ts` combined with the `check-subscription` edge function to determine user's active tier. Categories with `tier_required = 'pastor'` are locked for Reader-tier users.

