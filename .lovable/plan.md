
# Watch Hub + Current-Series Homepage Feature

Extends the existing Immersive Experiences system. No new tables where existing ones suffice; no redesign of the site or bottom bar shell.

---

## 1. Bottom navigation swap (in place)

File: `src/components/BottomNav.tsx`

- Replace the `Sermons` tab with `Watch`, icon `PlayCircle`, route `/watch`.
- Active state highlights on: `/watch`, `/watch/*`, `/experiences`, `/experiences/*`, `/series/*`.
- Keep the existing fixed positioning, `env(safe-area-inset-bottom)` padding, `lg:hidden` scoping, and current styling.
- Add optional small notification dot on the Watch icon when the signed-in viewer has unfinished experiences (reuses `experience_view_progress`) or when a new experience was published in the last 7 days. Cleared on visit to `/watch`.
- Hide the bar when the immersive player is in browser fullscreen (listen to `fullscreenchange`); restore on exit. Implemented via a small `useIsFullscreen()` hook plus `hidden` class — no layout change.

The old `useSermonsEnabled` kill-switch is preserved and now controls whether the Watch tab is visible (kept behavior consistent with the existing admin toggle).

---

## 2. Database — extend existing tables

Single migration. No new tables.

`immersive_experiences` — add nullable columns:
- `runtime_seconds int`
- `trailer_url text`
- `primary_scripture text`

`experience_series` — add nullable columns:
- `is_current_series boolean default false`
- `is_featured boolean default false`
- `featured_experience_id uuid` (FK → `immersive_experiences.id`, on delete set null)
- `homepage_visible boolean default false`
- `homepage_headline text`
- `homepage_description text`
- `homepage_artwork_url text`
- `homepage_mobile_artwork_url text`
- `homepage_preview_video_url text`
- `trailer_url text`
- `primary_watch_label text`
- `secondary_watch_label text`
- `display_start_at timestamptz`
- `display_end_at timestamptz`
- `featured_priority int default 0`

A partial unique index enforces "only one primary current series at a time":
```
create unique index one_current_series
  on public.experience_series ((true)) where is_current_series = true;
```

A `before update` trigger clears `is_current_series` on all other rows when one row is set to `true` (safety net for the UI).

RLS/GRANTs on `experience_series` already exist; no change needed.

---

## 3. `/watch` — streaming-style landing

New page `src/pages/Watch.tsx`. Sections, each hidden when empty:

- **Current Featured Series** — hero from the series flagged `is_current_series` (Watch Now → `/experiences/:slug` of `featured_experience_id`; Explore Series → `/series/:slug`).
- **Continue Watching** — signed-in only, from `experience_view_progress` where `completed = false`.
- **Latest Experiences** — newest published.
- **Upcoming Premiere** — nearest `experience_premieres.scheduled_at` in the future.
- **Popular Experiences** — sorted by `view_count` on `immersive_experiences` (fallback: recent).
- **Browse by Series** — grid from `experience_series` published.
- **Browse by Topic** / **Browse by Scripture** — grouped chips using `topic_tags` / `primary_scripture` fields already present or added above.
- **Recently Added** — last 30 days.

Route: `/watch`. Sub-route `/watch/series/:slug` mirrors existing `/experiences/series/:slug` (kept working via alias, see §6). Card cover images use existing `SmartImage` component for performance.

---

## 4. Homepage current-series preview

Component `src/components/home/CurrentSeriesFeature.tsx`, inserted in `src/pages/Index.tsx` directly under the hero (no other homepage changes).

Data source: single query for the row where `is_current_series = true AND homepage_visible = true AND now() between coalesce(display_start_at,'-infinity') and coalesce(display_end_at,'infinity')`. If none: component returns null.

Renders:
- Desktop: wide cinematic band with artwork/preview video left, copy stack right.
- Mobile: vertical card using `homepage_mobile_artwork_url` when present. Uses mobile artwork variable via CSS `<picture>` breakpoint.
- Fields: headline, description, primary scripture, current message title, runtime, premiere info.
- Buttons: **Watch Now** → `/experiences/:featured_experience_slug`; **View Series** → `/series/:series_slug`; **Watch Trailer** (only if `trailer_url` present, opens dialog); **Continue Watching** (only when signed-in and prior progress exists — deep-links to the experience).
- Whole card is clickable (`<Link>` wrapping) but inner buttons stop event propagation.

Video preview behavior:
- Muted, loop, `playsInline`, `preload="metadata"` — only mounted on desktop (`matchMedia('(min-width: 1024px) and (prefers-reduced-motion: no-preference)')`) via `IntersectionObserver`; pauses off-viewport.
- Otherwise poster image only. Never loads the full sermon video.

---

## 5. Admin controls

Two touch points, in the existing admin surface — no new admin route trees.

**`src/pages/admin/AdminSeries.tsx`** (existing) gains a "Homepage / Featured" section per row with:
- Toggle: Primary current series (radio-like: setting one clears others, via trigger).
- Toggle: Featured (non-primary spotlight).
- Toggle: Show on homepage.
- Toggle: Show on Watch page.
- Select: Current featured experience (dropdown of series' published experiences).
- Fields: Homepage headline, description, artwork URL (with existing upload), mobile artwork URL, preview video URL, trailer URL, primary/secondary button labels, display start/end, sort priority.

**`src/pages/admin/AdminExperienceEditor.tsx`** Details tab gains: runtime (mm:ss), trailer URL, primary scripture.

`useExperienceSeries.ts` hook extended with the new fields.

---

## 6. Route compatibility

`src/App.tsx`:
- Add `/watch` → `Watch.tsx`.
- Add `/series/:slug` as an alias that renders the existing `ExperienceSeriesPage`.
- Keep `/sermons` and `/sermons/:id` fully working (no deletion).
- Add a small redirect: when the public `/sermons` list is opened, if the site setting `redirect_sermons_to_watch` is on (new site_settings key, default off unless admin opts in), it navigates to `/watch`. Individual sermon detail pages stay put so social/SEO links keep resolving.
- Preserve old sermon content — no data changes.

---

## 7. Fullscreen bar behavior

Small utility hook `src/hooks/useIsFullscreen.ts`. `BottomNav` reads it and applies `translate-y-full` transition when in fullscreen so it slides out cleanly and restores on exit.

---

## Technical notes

- All new columns nullable / with safe defaults → no data migration.
- One migration file; grants unchanged (columns added to existing tables).
- No changes to auth, payments, or unrelated pages.
- `Watch` page uses existing React Query hooks (`useExperiences`, `useExperienceSeriesList`, `useMyProgress`); adds one thin hook `useCurrentSeries()`.
- Homepage feature lazy-loads video via `IntersectionObserver`; poster is `homepage_artwork_url`.
- Sermons kill-switch (`useSermonsEnabled`) continues to gate Watch tab visibility, since Watch supersedes Sermons.

---

## Files touched

```text
supabase migration           (extend 2 tables, 1 trigger, 1 partial index)
src/components/BottomNav.tsx
src/hooks/useIsFullscreen.ts               (new)
src/hooks/useCurrentSeries.ts              (new)
src/hooks/useExperienceSeries.ts           (extend types)
src/pages/Watch.tsx                        (new)
src/components/home/CurrentSeriesFeature.tsx (new)
src/pages/Index.tsx                        (insert feature under hero)
src/pages/admin/AdminSeries.tsx            (extend form)
src/pages/admin/AdminExperienceEditor.tsx  (3 fields)
src/App.tsx                                (add /watch, /series/:slug)
```

Reply "go" and I will implement in this order: migration → bottom nav + hook → hooks/data → Watch page → homepage feature → admin controls → route aliases.
