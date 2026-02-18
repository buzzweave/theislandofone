
# Add Facebook App ID Setting to Blog Manager

## What This Does
Adds a "Facebook Settings" section at the top of the Blog Manager where you can enter and save your Facebook App ID. All three sharing functions (blog, book, sermon) will then read this saved ID from the database instead of using the hardcoded one.

## Changes

### 1. Admin Blog Manager UI (`src/pages/admin/AdminBlogManager.tsx`)
- Add a collapsible "Facebook Settings" card above the post list
- Input field for Facebook App ID, pre-filled with the current saved value
- Save button that writes the value to the `site_settings` table with key `fb_app_id`
- Loads the current value on page load from `site_settings`

### 2. Edge Functions (share-blog, share-book, share-sermon)
- Each function will query `site_settings` for the `fb_app_id` key before rendering the HTML
- If no value is found, it falls back to the current default `1169014871775113`
- This means sharing works immediately (using the existing ID) and updates as soon as you save a new one

### 3. No Database Changes Needed
The `site_settings` table already exists with `key` and `value` columns, and already has anon SELECT + admin INSERT/UPDATE policies. The edge functions use the service role key so they can always read it.

## How It Will Look

At the top of the Blog Manager page, a small settings panel:

```text
+------------------------------------------+
| Facebook Settings                        |
|                                          |
| Facebook App ID                          |
| [1169014871775113            ]  [ Save ] |
+------------------------------------------+
```

After saving, all blog/book/sermon shares will use the new ID in their OG metadata.
