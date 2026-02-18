

# Import Blog Posts into Lovable Cloud Database

## Will Images and Previews Work?

**Yes.** The `image_url` column stores a full URL pointing to where the image lives on your VPS. Moving the post metadata into the Lovable Cloud database does not move the images -- they stay hosted on your VPS and will continue to display correctly everywhere (blog page, cards, and Facebook previews).

## What Changes

### 1. Create an Import Edge Function (`sync-blog-posts`)
A new backend function that fetches all blog posts from `https://api.theislandofone.com/api/blog-posts` and upserts them into the existing `blog_posts` table in Lovable Cloud. You can trigger this from the Admin Blog Manager with a "Sync from VPS" button.

### 2. Update Frontend Hooks to Read from Lovable Cloud
Switch `useBlogPosts.ts` and the `BlogPost` page query from calling the VPS API to querying the local database directly using the database client. This will make page loads faster since there's no external API call.

### 3. Update `share-blog` Edge Function
Switch it back to querying the local `blog_posts` table instead of calling the VPS API. Since the data is now local, this is faster and more reliable for Facebook crawlers.

### 4. Admin Blog Manager Gets a Sync Button
Add a "Sync from VPS" button in the Blog Manager so you can pull the latest posts from your VPS whenever needed. New posts created in the admin panel will save directly to the Lovable Cloud database.

## Flow After Implementation

```text
VPS API (source of truth for existing posts)
    |
    v  [Sync button in Admin]
Lovable Cloud Database (blog_posts table)
    |
    +---> Blog page (reads from local DB)
    +---> BlogPost detail page (reads from local DB)
    +---> share-blog Edge Function (reads from local DB)
    +---> Facebook crawler gets correct OG tags + image
```

## Important Notes

- **Images stay on VPS** -- only the post text/metadata is copied into the local database
- **Image URLs must be HTTPS** for Facebook to load them reliably. If your VPS serves images over HTTP only, Facebook may not display them
- The existing `blog_posts` table already has the right schema -- no database changes needed
- After the initial sync, you can manage posts directly in the Lovable Cloud admin or re-sync from VPS anytime

