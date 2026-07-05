-- 在 Supabase SQL Editor 中执行以下语句创建 memories 表

CREATE TABLE memories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  event_date TEXT NOT NULL DEFAULT '未知',
  event_date_end TEXT,
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

-- 用户基础档案：用于让生成内容更像“这个人”，而不是只拼经历
CREATE TABLE profiles (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  real_name TEXT NOT NULL DEFAULT '',
  identity_stage TEXT NOT NULL DEFAULT '',
  school TEXT NOT NULL DEFAULT '',
  major TEXT NOT NULL DEFAULT '',
  grade TEXT NOT NULL DEFAULT '',
  target_direction TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  contact_phone TEXT NOT NULL DEFAULT '',
  preferred_tone TEXT NOT NULL DEFAULT '自然、具体、不过度夸张',
  extra_info TEXT NOT NULL DEFAULT ''
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- 生成历史：记录每次 AI 生成的内容，方便用户回溯
CREATE TABLE generated_histories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  type TEXT NOT NULL DEFAULT 'custom',
  title TEXT NOT NULL DEFAULT '',
  prompt_summary TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  inputs JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_generated_histories_user_id ON generated_histories(user_id);
CREATE INDEX idx_generated_histories_created_at ON generated_histories(created_at DESC);

ALTER TABLE generated_histories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own histories" ON generated_histories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own histories" ON generated_histories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own histories" ON generated_histories
  FOR DELETE USING (auth.uid() = user_id);
