-- 在 Supabase SQL Editor 中执行以下语句创建 memories 表

CREATE TABLE memories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  event_date TEXT NOT NULL DEFAULT '未知',
  category TEXT NOT NULL DEFAULT '其他',
  title TEXT NOT NULL DEFAULT '',
  result TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  emotion TEXT NOT NULL DEFAULT 'neutral',
  emotion_note TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}',
  raw_input TEXT NOT NULL DEFAULT ''
);

-- 创建索引
CREATE INDEX idx_memories_user_id ON memories(user_id);
CREATE INDEX idx_memories_created_at ON memories(created_at DESC);
CREATE INDEX idx_memories_category ON memories(category);
CREATE INDEX idx_memories_emotion ON memories(emotion);

-- 启用 RLS（行级安全）
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

-- 用户只能访问自己的记忆
CREATE POLICY "Users can view own memories" ON memories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memories" ON memories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memories" ON memories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own memories" ON memories
  FOR DELETE USING (auth.uid() = user_id);
