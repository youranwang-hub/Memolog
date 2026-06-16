export type Emotion = "proud" | "excited" | "relieved" | "neutral" | "tired" | "frustrated" | "sad";

export type Category = "竞赛" | "项目" | "实习" | "课程" | "生活" | "技能" | "其他";

export interface Memory {
  id: string;
  user_id: string;
  created_at: string;
  event_date: string;
  category: Category;
  title: string;
  result: string;
  content: string;
  emotion: Emotion;
  emotion_note: string;
  tags: string[];
  raw_input: string;
}

export interface ExtractedMemory {
  event_date: string;
  category: Category;
  title: string;
  result: string;
  content: string;
  emotion: Emotion;
  emotion_note: string;
  tags: string[];
}

export const CATEGORIES: Category[] = ["竞赛", "项目", "实习", "课程", "生活", "技能", "其他"];

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
