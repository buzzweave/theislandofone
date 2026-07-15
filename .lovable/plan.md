# Immersive Series Builder — Staged Implementation Plan

## Guardrails (apply to every stage)
- Do NOT modify existing routes, layout, navigation, branding, auth, or any admin section other than adding a new one.
- Reuse: `AdminLayout`, `AdminGuard`, `useAdminAuth`, `user_roles` (`has_role`), `profiles`, existing storage buckets (`site-assets`, `audio-files`, `video-thumbnails`), `SmartImage`, `supabaseImageUrl`, existing sermon/series/media conventions.
- All new admin routes live under `/admin/experiences/*` and register in `AdminLayout` nav as **"Immersive Experiences"** — a single new entry, nothing else touched.
- All new public routes under `/experience/:slug` and `/series/:slug` — no conflict with `/sermons`, `/books`, `/blog`.
- External video only (Vimeo / Mux / Cloudflare Stream / Bunny / YouTube). Store provider + playback ID; never upload masters to Supabase.
- Every new `public.` table ships with GRANTs + RLS + policies in the same migration.
- After each stage: build passes, existing pages verified, short changelog reported. Wait for approval before the next stage.

---

## Stage 1 — Database, roles, RLS

New tables (all with `created_at`, `updated_at`, `created_by uuid references auth.users`, `status` where relevant, proper indexes):

- `experience_series` — title, slug, description, artwork, trailer_url, order_index, status
- `immersive_experiences` — series_id (nullable), title, slug (unique), short/long description, primary_scripture, supporting_scriptures (jsonb), speaker, release_date, premiere_at, runtime_seconds, category, audience, featured_image, mobile_image, cinematic_bg, trailer_url, video_provider, video_playback_id, video_url, poster, captions_url, transcript, ambient_audio_url, theme (jsonb), social_image, visibility (`public|members|private|scheduled`), status (`draft|scheduled|published|archived`), members_only bool, allow_download bool, view_count, published_at
- `experience_scenes` — experience_id, order_index, scene_type (enum via check), title, internal_label, start_ts, end_ts, background_url, background_kind, ambient_audio_url, heading, body, scripture, scripture_ref, quote, animation, transition, overlay_opacity, text_align, cta (jsonb), mobile (jsonb), enabled bool
- `experience_interactions` — experience_id, scene_id (nullable), kind, name, heading, body, appear_ts, expire_ts, duration_ms, required bool, button_label, destination, confirmation, follow_up (jsonb), audience, mobile (jsonb), anonymous_allowed bool, order_index
- `experience_media` — experience_id (nullable), kind, url, storage_path, mime, width, height, duration, tags (text[]), title, notes
- `experience_view_progress` — experience_id, user_id (nullable), anon_id, position_seconds, completed bool, last_seen_at, unique(experience_id, user_id) / (experience_id, anon_id)
- `experience_events` — experience_id, user_id (nullable), anon_id, kind, ts, payload jsonb (analytics: start, drop, interaction_click, scripture_open, share, complete)
- `experience_responses` — experience_id, interaction_id (nullable), user_id (nullable), anon_id, kind (`reflection|poll|amen|next_step|testimony|salvation|rededication|group|contact`), payload jsonb, is_private bool
- `prayer_requests` — experience_id (nullable), user_id (nullable), anon_id, name, contact, message, urgency, status (`new|claimed|contacted|resolved`), claimed_by, private_notes, visibility (`private` default)
- `prayer_assignments` — request_id, team_member_id, assigned_by, assigned_at, status
- `experience_chat_messages` — experience_id, user_id, display_name, body, is_moderated, created_at
- `experience_premieres` — experience_id, starts_at, ends_at, host_message, viewer_count_cached
- `experience_team_members` — experience_id, user_id, role (`editor|prayer|host`)

Roles: extend `app_role` enum with `content_editor` and `prayer_team` (if not present). All privileged writes gated by `has_role(auth.uid(), 'admin')` OR appropriate role. Prayer notes readable only by admin + prayer_team.

Public read policy: only rows where `immersive_experiences.status = 'published'` AND visibility in (`public`,`scheduled`). Members-only rows filtered via existing `user_has_book_access`-style helper adapted to experiences (new `user_has_experience_access` security-definer function).

Anonymous participation: `anon_id` (client-generated uuid stored in localStorage) accepted on progress/events/responses/prayer inserts with strict column allowlist; no reads back except own row via matching header (or just write-only insert policy).

## Stage 2 — Admin Experiences Dashboard
Route: `/admin/experiences`. Card + table view, search/filter/sort/duplicate/preview/edit/archive/delete. Add single sidebar entry "Immersive Experiences" to `AdminLayout` nav.

## Stage 3 — Experience Editor + Media
Route: `/admin/experiences/:id`. Tabbed editor (Details, Video, Media, Scenes, Timeline, Interactions, Response Room, Preview, Settings). Media library tab reads/writes `experience_media`, backed by `site-assets` bucket under `experiences/{id}/`. Autosave with debounce, draft indicator.

## Stage 4 — Scene Builder + Timeline
Drag-and-drop scene list (reuse `SortableChapterList` pattern). Timeline component maps scenes + interactions onto video duration; edit exact `appear_ts`. All scene types from spec available as templates.

## Stage 5 — Public Cinematic Player
Routes: `/experience/:slug`, `/series/:slug`. Fullscreen dark shell, cinematic entrance card → player. External-provider adapters (Vimeo / Mux / Cloudflare Stream / Bunny / YouTube / direct MP4). Timed overlays driven by `experience_interactions`. Progress save (auth or anon). Captions, keyboard, reduced-motion. Isolated from site chrome (no global `Layout`).

## Stage 6 — Prayer, Response, Next-Step
Response Room scene at end of experience. Private prayer flow → `prayer_requests`. Admin `/admin/experiences/prayer` dashboard for prayer_team + admin: claim, assign, notes, resolve.

## Stage 7 — Premiere Lobby + Optional Chat
Countdown + ambient lobby before `premiere_at`. Realtime chat via Supabase Realtime on `experience_chat_messages` (opt-in, collapsible). Enable publication only for that table.

## Stage 8 — Analytics
Admin analytics tab per experience: starts, unique viewers, avg watch, completion, drop-off, interaction clicks, responses, prayer count, region (from IP header hash, no PII), device. Backed by `experience_events`.

## Stage 9 — "The Service Elevator" demo
Seed one series + one experience with 11 scenes and placeholder media using the migration/insert tool. All content editable from admin.

## Stage 10 — QA
Responsive + a11y pass, `code--exec` build check, run `security--run_security_scan`, fix criticals, update security memory.

## New routes summary
Admin: `/admin/experiences`, `/admin/experiences/new`, `/admin/experiences/:id`, `/admin/experiences/prayer`, `/admin/experiences/series`
Public: `/experience/:slug`, `/series/:slug`

## Existing things reused (not modified)
`AdminLayout`, `AdminGuard`, `AdminErrorBoundary`, `useAdminAuth`, `user_roles`+`has_role`, `profiles`, `SmartImage`, `supabaseImage.ts`, `supabaseUpload.ts`, existing buckets, existing toast/UI kit.

## Nothing else changes
No edits to Books, Sermons, Blog, Audiobooks, Graphics, Videos, CRM, Publisher, Auth, Login, Home, or any current admin page beyond adding the single nav entry.

---

Reply "go" (or "start stage 1") and I'll ship Stage 1 (migration only) for approval, then proceed stage-by-stage.
