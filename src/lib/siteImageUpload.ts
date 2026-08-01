import { supabase } from '@/integrations/supabase/client';

export const SITE_IMAGE_BUCKET = 'site-images';
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
const TEN_YEARS_SECONDS = 60 * 60 * 24 * 365 * 10;

export type UploadResult = { url: string } | { error: string };

/** Validate + upload a site image and return a long-lived URL for it. */
export async function uploadSiteImage(file: File, keyHint: string): Promise<UploadResult> {
  if (!file.type.startsWith('image/')) {
    return { error: 'That file is not an image. Please choose a PNG, JPG, WebP, or SVG.' };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: 'Image is too large. Please choose a file under 8 MB.' };
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  const safeKey = keyHint.replace(/[^a-z0-9._-]+/gi, '-').toLowerCase();
  const path = `${safeKey}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(SITE_IMAGE_BUCKET)
    .upload(path, file, { cacheControl: '31536000', upsert: true, contentType: file.type });

  if (uploadError) return { error: uploadError.message };

  const { data, error: signError } = await supabase.storage
    .from(SITE_IMAGE_BUCKET)
    .createSignedUrl(path, TEN_YEARS_SECONDS);

  if (signError || !data?.signedUrl) {
    return { error: signError?.message ?? 'Could not generate a URL for the uploaded image.' };
  }

  return { url: data.signedUrl };
}
