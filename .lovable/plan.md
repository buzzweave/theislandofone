

## Fix Remaining Warn-Level Security Issues

### Issues to Address

1. **RLS Policy Always True (7 findings)** -- Restrict write access on `blog_posts` and `site_settings` to admin-only. Mark `contact_submissions` INSERT as intentionally public.

2. **Leaked Password Protection Disabled** -- Enable leaked password protection in auth configuration.

3. **Dual Admin System** -- Update finding to reflect known architectural constraint (no code fix).

---

### Step 1: Database Migration -- Secure `blog_posts` and `site_settings`

Create a migration that:

**blog_posts** -- Replace all permissive policies with admin-only:
```sql
DROP POLICY IF EXISTS "Anyone can insert blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Anyone can update blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Anyone can delete blog posts" ON public.blog_posts;

CREATE POLICY "Admins can insert blog posts"
  ON public.blog_posts FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update blog posts"
  ON public.blog_posts FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete blog posts"
  ON public.blog_posts FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));
```

**site_settings** -- Replace permissive INSERT/UPDATE with admin-only:
```sql
DROP POLICY IF EXISTS "Anyone can insert site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Anyone can update site settings" ON public.site_settings;

CREATE POLICY "Admins can insert site settings"
  ON public.site_settings FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update site settings"
  ON public.site_settings FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));
```

### Step 2: Enable Leaked Password Protection

Use the auth configuration tool to enable leaked password protection, which checks passwords against known breached password databases during signup and password changes.

### Step 3: Update Security Findings

- **Ignore** the remaining `SUPA_rls_policy_always_true` for `contact_submissions` INSERT (intentional public form)
- **Mark** `dual_admin_system` as a known architectural constraint with increased remediation difficulty
- **Delete** resolved findings after migration succeeds

### Step 4: Verify Edge Function Compatibility

Review `sync-blog-posts` edge function and any admin code that writes to `blog_posts` or `site_settings` to confirm they use service role (which bypasses RLS) or authenticated admin sessions. The `sync-blog-posts` function already uses `serviceClient` with `SUPABASE_SERVICE_ROLE_KEY`, so it will continue to work.

---

### Impact

- Closes 5 of the 7 RLS "Always True" warnings (blog_posts x3, site_settings x2)
- Marks remaining 2 as intentional (contact_submissions, speaking_requests)
- Enables leaked password protection
- Documents dual admin system as architectural decision
- Also resolves the overlapping error-level findings for blog_posts and site_settings

