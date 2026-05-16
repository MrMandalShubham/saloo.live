-- Add image_url column to services table
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL;

-- Create service-photos storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('service-photos', 'service-photos', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to service-photos
CREATE POLICY "service_photos_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'service-photos');

-- Allow public read access
CREATE POLICY "service_photos_select"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'service-photos');

-- Allow owners to update/delete their uploads
CREATE POLICY "service_photos_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'service-photos');

CREATE POLICY "service_photos_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'service-photos');
