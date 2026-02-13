
# Email, Notifications, Contact Form, and PWA Implementation

This is a large feature set spanning four major areas. Here is the plan broken into phases.

---

## Phase 1: Database Tables

Create three new tables in the database:

- **contact_submissions** -- stores contact form entries (name, email, phone, message, page_url, status, admin_notes, created_at)
- **notifications** -- stores in-app notifications (type, title, preview, data JSON, is_read, created_at) for the admin bell icon
- **smtp_settings** -- stores SMTP config (host, port, username, encrypted_password, encryption, from_name, from_email, reply_to, is_verified) with admin-only access

RLS policies:
- contact_submissions: anyone can INSERT, admin can SELECT/UPDATE/DELETE
- notifications: admin can SELECT/INSERT/UPDATE/DELETE
- smtp_settings: admin-only for all operations

---

## Phase 2: Contact Page

Create a new **Contact** page at `/contact`:
- Fields: Name, Email, Phone, Message + hidden honeypot field
- Zod validation on submit
- Posts to a new `send-notification` edge function
- Success confirmation state after submission
- Add "Contact" link to the public navigation bar

---

## Phase 3: Edge Function -- `send-notification`

A single edge function that handles form submissions and email sending:

1. Accepts POST with `{ type: "contact" | "speaker_request", data: {...} }`
2. Server-side validation (honeypot check, field length limits)
3. Saves the submission to the appropriate table (contact_submissions or speaking_requests via Supabase)
4. Creates an in-app notification record in the notifications table
5. Reads SMTP settings from smtp_settings table
6. If SMTP is configured and verified, sends email to support@buzzweave.com with proper subject/Reply-To
7. If SMTP is not configured, marks notification with `email_queued: true` flag
8. Returns success response

The Speaker Request form will also be updated to call this edge function instead of the VPS API, so both forms go through the same pipeline.

---

## Phase 4: SMTP Settings in Admin

Add an **Email Settings** card to the existing Admin Settings page:
- Fields: SMTP Host, Port, Username, Password (masked), Encryption (TLS/SSL dropdown), From Name, From Email, Reply-To Email
- "Test SMTP" button that calls the edge function with a test email action
- Stored in the smtp_settings table (password stored server-side only, never sent back to client)
- Status indicator showing "Configured" or "Not configured"

---

## Phase 5: Notification Bell Icon

Add a bell icon to the admin top navigation bar:

1. **AdminLayout.tsx** -- Add a Bell icon with unread count badge next to the AI toggle button
2. **NotificationDropdown component** -- Clicking bell opens a dropdown showing latest 10 notifications with type icon, title, preview, timestamp, and "Mark as read" button
3. **Admin Notifications page** at `/admin/notifications` -- Full page with filtering (All / Unread / Contact / Speaker), bulk mark-as-read, and delete
4. **useNotifications hook** -- Fetches from Supabase notifications table, provides unread count, mark-read, and delete functions

---

## Phase 6: PWA Install

Make the site installable as a PWA:

1. Install `vite-plugin-pwa` dependency
2. Configure in `vite.config.ts` with manifest (name, icons, theme_color, display: standalone)
3. Add `navigateFallbackDenylist: [/^\/~oauth/]` to service worker config
4. Generate PWA icons from the existing `/public/logo.png` (192x192, 512x512 sizes)
5. Add a **"Download App"** button in the public header (Layout.tsx) that triggers the browser install prompt
6. For iOS Safari (which doesn't support install prompt), show a modal with instructions to "Share > Add to Home Screen"
7. Add mobile-optimized meta tags to `index.html` (apple-touch-icon, theme-color, apple-mobile-web-app-capable)

---

## Phase 7: Update Speaker Request Form

Update the existing Speaking page to:
- Add honeypot field for spam protection
- Route submission through the `send-notification` edge function instead of the VPS API
- Add additional optional fields (phone, event_location, expected attendance, budget/honorarium) to match the email template requirements

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/pages/Contact.tsx` | Contact form page |
| `src/components/admin/NotificationBell.tsx` | Bell icon + dropdown |
| `src/pages/admin/AdminNotifications.tsx` | Full notifications page |
| `src/hooks/useNotifications.ts` | Notification data hook |
| `supabase/functions/send-notification/index.ts` | Email + notification edge function |
| `public/icons/icon-192x192.png` | PWA icon (generated from logo) |
| `public/icons/icon-512x512.png` | PWA icon (generated from logo) |
| `src/components/InstallPrompt.tsx` | PWA install button + iOS modal |

## Files to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Add Contact and AdminNotifications routes |
| `src/components/Layout.tsx` | Add Contact nav link + Download App button |
| `src/components/admin/AdminLayout.tsx` | Add notification bell to header, add Notifications nav item |
| `src/pages/admin/AdminSettings.tsx` | Add SMTP settings card |
| `src/pages/Speaking.tsx` | Add honeypot, route through edge function, add optional fields |
| `index.html` | Add PWA meta tags |
| `vite.config.ts` | Add vite-plugin-pwa config |
| `supabase/config.toml` | Add send-notification function entry |

---

## Technical Details

### Edge function email sending
Since we cannot use Nodemailer in Deno edge functions, the `send-notification` function will use raw SMTP via Deno's `net.connect` API or a lightweight Deno SMTP library (`denomailer`). It reads SMTP credentials from the database at runtime so the admin can change them without redeployment.

### Spam protection
- Honeypot: hidden field named `website` -- if filled, silently reject
- Rate limiting: track submissions per IP in a simple in-memory map with 5-minute window (max 3 submissions)
- Server-side Zod validation of all fields

### SMTP password security
- Password is encrypted before storage using AES-256 with the SUPABASE_SERVICE_ROLE_KEY as the encryption key
- The client never receives the password back -- only a masked indicator ("********" if set)
- The edge function decrypts it at runtime when sending emails

### PWA install flow
- Listen for the `beforeinstallprompt` event, store it, show "Download App" button
- On click, call `prompt()` on the stored event
- On iOS, detect via `navigator.userAgent` and show manual instructions modal
