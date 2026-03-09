
-- Add indexes for graphics query optimization
CREATE INDEX IF NOT EXISTS idx_graphics_is_active_sort ON public.graphics (is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_graphics_category ON public.graphics (category);
CREATE INDEX IF NOT EXISTS idx_graphics_created_at ON public.graphics (created_at DESC);

-- Graphics folders indexes
CREATE INDEX IF NOT EXISTS idx_graphics_folders_is_active_sort ON public.graphics_folders (is_active, sort_order);

-- Graphics folder images indexes
CREATE INDEX IF NOT EXISTS idx_graphics_folder_images_folder_id ON public.graphics_folder_images (folder_id, sort_order);

-- Books indexes
CREATE INDEX IF NOT EXISTS idx_books_is_published_sort ON public.books (is_published, sort_order);

-- Sermons indexes
CREATE INDEX IF NOT EXISTS idx_sermons_featured_sort ON public.sermons (featured, sort_order);

-- Blog posts indexes
CREATE INDEX IF NOT EXISTS idx_blog_posts_is_published_date ON public.blog_posts (is_published, published_at DESC);

-- Videos indexes
CREATE INDEX IF NOT EXISTS idx_videos_is_active_sort ON public.videos (is_active, sort_order);

-- Members indexes for access checks
CREATE INDEX IF NOT EXISTS idx_members_email ON public.members (email);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON public.members (user_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON public.members (status);
