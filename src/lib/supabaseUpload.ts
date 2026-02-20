import { supabase } from "@/integrations/supabase/client";

/**
 * Upload a file to Supabase Storage and return the public URL.
 * Falls back to VPS API upload if Supabase storage fails.
 */
export async function uploadToStorage(
  bucket: string,
  file: File,
  folder = ""
): Promise<string> {
  const ext = file.name.split(".").pop() || "bin";
  const fileName = `${folder ? folder + "/" : ""}${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, { upsert: true });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}
