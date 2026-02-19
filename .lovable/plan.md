

# Fix Facebook Share Images -- Deployment and Configuration

## Problem
When sharing blog posts or books to Facebook, no images appear because:
1. The `share-blog` and `share-book` backend functions are not deployed -- Facebook's crawler gets a 404
2. The Facebook App ID is missing from the database settings

## Fix Steps

### Step 1 -- Deploy the share functions
Deploy `share-blog` and `share-book` so Facebook's crawler can reach the Open Graph metadata pages. No code changes needed -- these functions already exist and are correct.

### Step 2 -- Save your Facebook App ID
Insert your Facebook App ID (`1169014871775113` based on the default in your code) into the `site_settings` table so the share pages include it in the `fb:app_id` meta tag.

This will be done via a small database migration:
```sql
INSERT INTO site_settings (key, value)
VALUES ('fb_app_id', '1169014871775113')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

### Step 3 -- Verify
After deployment, test by pasting a share URL into Facebook's Sharing Debugger to confirm the image, title, and description appear correctly.

## What stays the same
- No changes to `share-blog/index.ts` or `share-book/index.ts` -- the code is already correct
- No changes to `BlogPost.tsx`, `BookDetail.tsx`, or `SocialShareLinks.tsx`
- The share URLs in the frontend already point to the correct function endpoints

