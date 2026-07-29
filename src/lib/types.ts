export type Emotion = "proud" | "excited" | "relieved" | "neutral" | "tired" | "frustrated" | "sad";

export type Category = string;

export type GenerateType = "resume" | "intro" | "custom";

export interface Memory {
  id: string;
  user_id: string;
  created_at: string;
  event_date: string;
  event_date_end?: string | null;
  category: Category;
  title: string;
  result: string;
  content: string;
  emotion: Emotion;
  emotion_note: string;
  tags: string[];
  raw_input: string;
}

export interface MemoryAttachment {
  id: string;
  memory_id: string;
  user_id: string;
  storage_path: string;
  sort_order: number;
  created_at: string;
}

export interface ExtractedMemory {
  event_date: string;
  event_date_end?: string | null;
  category: Category;
  title: string;
  result: string;
  content: string;
  emotion: Emotion;
  emotion_note: string;
  tags: string[];
}

export interface Profile {
  user_id: string;
  created_at: string;
  updated_at: string;
  display_name: string;
  real_name: string;
  identity_stage: string;
  school: string;
  major: string;
  grade: string;
  target_direction: string;
  contact_email: string;
  contact_phone: string;
  preferred_tone: string;
  extra_info: string;
  custom_categories: string[];
}

export type ProfileInput = Omit<Profile, "created_at" | "updated_at">;

export interface GeneratedHistory {
  id: string;
  user_id: string;
  created_at: string;
  type: GenerateType;
  title: string;
  prompt_summary: string;
  content: string;
  inputs: Record<string, unknown>;
}

export type GeneratedHistoryInput = Omit<GeneratedHistory, "id" | "created_at">;

export const DEFAULT_CATEGORIES = ["竞赛", "项目", "实习", "课程", "生活", "技能", "其他"] as const;

export function getCategories(categories?: string[]) {
  return Array.from(
    new Set((categories ?? DEFAULT_CATEGORIES).map((category) => category.trim()).filter(Boolean))
  );
}

export const EMOTIONS: { value: Emotion; label: string; emoji: string }[] = [
  { value: "proud", label: "自豪", emoji: "😤" },
  { value: "excited", label: "兴奋", emoji: "🎉" },
  { value: "relieved", label: "如释重负", emoji: "😌" },
  { value: "neutral", label: "平淡", emoji: "😐" },
  { value: "tired", label: "疲惫", emoji: "😮‍💨" },
  { value: "frustrated", label: "沮丧", emoji: "😞" },
  { value: "sad", label: "难过", emoji: "😢" },
];

export const EMOTION_MAP = Object.fromEntries(
  EMOTIONS.map((e) => [e.value, e])
) as Record<Emotion, (typeof EMOTIONS)[number]>;
