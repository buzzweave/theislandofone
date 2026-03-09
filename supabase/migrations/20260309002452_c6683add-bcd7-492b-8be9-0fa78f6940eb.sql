
-- Enable RLS on graphics_folders
ALTER TABLE public.graphics_folders ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins can manage graphics_folders"
  ON public.graphics_folders FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Public can view active folders
CREATE POLICY "Anyone can view active graphics_folders"
  ON public.graphics_folders FOR SELECT
  USING (is_active = true);

-- Enable RLS on graphics_folder_images
ALTER TABLE public.graphics_folder_images ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins can manage graphics_folder_images"
  ON public.graphics_folder_images FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Public can view images in active folders
CREATE POLICY "Anyone can view images in active folders"
  ON public.graphics_folder_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.graphics_folders
      WHERE graphics_folders.id = graphics_folder_images.folder_id
        AND graphics_folders.is_active = true
    )
  );
