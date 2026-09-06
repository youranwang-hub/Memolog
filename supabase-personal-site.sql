-- Run once in the Supabase SQL Editor. These rows are distinct from private memories.
CREATE TABLE IF NOT EXISTS public.personal_site_memories (
  memory_id UUID PRIMARY KEY REFERENCES public.memories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  title TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '其他',
  tags TEXT[] NOT NULL DEFAULT '{}',
  event_date TEXT NOT NULL DEFAULT '未知',
  event_date_end TEXT,
  cover_image_url TEXT,
  publish_cover_image BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_personal_site_memories_user_public
  ON public.personal_site_memories(user_id, is_public);

ALTER TABLE public.personal_site_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own personal site versions" ON public.personal_site_memories
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own personal site versions" ON public.personal_site_memories
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own personal site versions" ON public.personal_site_memories
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own personal site versions" ON public.personal_site_memories
  FOR DELETE USING (auth.uid() = user_id);
