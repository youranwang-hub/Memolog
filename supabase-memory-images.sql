-- Execute this file once in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS memory_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_id UUID REFERENCES memories(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_memory_attachments_memory_id
  ON memory_attachments(memory_id, sort_order);

ALTER TABLE memory_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own memory attachments" ON memory_attachments;
CREATE POLICY "Users can view own memory attachments" ON memory_attachments
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add own memory attachments" ON memory_attachments;
CREATE POLICY "Users can add own memory attachments" ON memory_attachments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM memories
      WHERE memories.id = memory_id AND memories.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own memory attachments" ON memory_attachments;
CREATE POLICY "Users can delete own memory attachments" ON memory_attachments
  FOR DELETE USING (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'memory-images',
  'memory-images',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Users can view own memory images" ON storage.objects;
CREATE POLICY "Users can view own memory images" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'memory-images'
    AND (storage.foldername(name))[1] = (select auth.uid()::text)
  );

DROP POLICY IF EXISTS "Users can upload own memory images" ON storage.objects;
CREATE POLICY "Users can upload own memory images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'memory-images'
    AND (storage.foldername(name))[1] = (select auth.uid()::text)
  );

DROP POLICY IF EXISTS "Users can delete own memory images" ON storage.objects;
CREATE POLICY "Users can delete own memory images" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'memory-images'
    AND (storage.foldername(name))[1] = (select auth.uid()::text)
  );
