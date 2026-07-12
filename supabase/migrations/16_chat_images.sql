-- Chat images + allow empty text when image present
ALTER TABLE messages ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE messages ALTER COLUMN content SET DEFAULT '';

INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-images', 'chat-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "chat_images_public_read" ON storage.objects;
CREATE POLICY "chat_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'chat-images');

DROP POLICY IF EXISTS "chat_images_user_write" ON storage.objects;
CREATE POLICY "chat_images_user_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "chat_images_user_update" ON storage.objects;
CREATE POLICY "chat_images_user_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'chat-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "chat_images_user_delete" ON storage.objects;
CREATE POLICY "chat_images_user_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'chat-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
