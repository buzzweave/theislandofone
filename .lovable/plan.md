

# Fix Notification Details + White Text on Sermon/Book Pages

## Problem 1: Notifications Missing Full Details

When someone submits a contact or speaker request form, the notification bell and notifications page only show a short title and preview line. The full form data (name, email, phone, organization, event details, message, etc.) is stored in the `data` JSON column but never displayed.

## Problem 2: Grey Text on Sermon/Book Detail Pages

Text appears grey instead of white due to CSS classes like `text-foreground/90` and `text-secondary-foreground`.

---

## Changes

### 1. `src/pages/admin/AdminNotifications.tsx` -- Show Full Details

- Add expandable detail view: clicking a notification row expands it to show ALL submitted form fields
- For **contact** notifications, display: Name, Email, Phone, Message, Page URL
- For **speaker** notifications, display: Name, Email, Phone, Organization, Event Type, Event Date, Event Location, Message
- Label contact notifications as "Contacts" and speaker notifications as "Speaker" in the filter chips

### 2. `src/components/admin/NotificationBell.tsx` -- Show Type Labels

- Show "Contact" or "Speaker" badge/label on each notification in the dropdown so the admin knows what type it is at a glance

### 3. `src/pages/SermonDetail.tsx` -- White Text Fix

- Line 77: Add `[&_*]:!text-white` to the HTML prose container
- Line 82: Change `text-secondary-foreground` to `text-white`
- Line 143: Change `text-foreground/90` to `text-white`

### 4. `src/pages/BookDetail.tsx` -- White Text Fix

- Line 53: Add `[&_*]:!text-white` to the HTML prose container
- Line 59: Change `text-secondary-foreground` to `text-white`
- Line 103: Change `text-secondary-foreground` to `text-white` on description
- Line 207: Add `[&_*]:!text-white` to chapter content prose container

---

## Technical Details

### Expanded Notification Detail View

Each notification card becomes clickable/expandable. When expanded, the `data` JSON is read and rendered as a labeled list:

```text
+------------------------------------------+
| [Mail icon] New Contact Submission       |
| John Doe -- Hello, I have a question...  |
| 2 minutes ago                            |
|                                          |
| [Expanded Detail]                        |
|   Name:     John Doe                     |
|   Email:    john@example.com             |
|   Phone:    555-1234                      |
|   Message:  Hello, I have a question...  |
|   Page URL: /contact                     |
+------------------------------------------+
```

For speaker requests:

```text
+------------------------------------------+
| [Mic icon] New Speaker Request           |
| Jane Smith -- Conference on 2026-03-15   |
| 5 minutes ago                            |
|                                          |
| [Expanded Detail]                        |
|   Name:         Jane Smith               |
|   Email:        jane@example.com         |
|   Phone:        555-5678                 |
|   Organization: Faith Church             |
|   Event Type:   Conference               |
|   Event Date:   2026-03-15               |
|   Location:     Houston, TX              |
|   Message:      We'd love to have you... |
+------------------------------------------+
```

### Files Changed

| File | Change |
|------|--------|
| `src/pages/admin/AdminNotifications.tsx` | Add expandable detail view showing all form fields from `n.data` |
| `src/components/admin/NotificationBell.tsx` | Add type badge (Contact/Speaker) on each notification item |
| `src/pages/SermonDetail.tsx` | Force white text on manuscript content |
| `src/pages/BookDetail.tsx` | Force white text on chapter and description content |

