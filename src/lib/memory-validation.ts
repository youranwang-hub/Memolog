import { normalizeEventDate, validateDateRange } from "./dates";
import { EMOTIONS, type ExtractedMemory } from "./types";

export const MAX_TAGS = 8;
export const MAX_TAG_LENGTH = 16;
export const MAX_MEMORY_TEXT = 5000;
export function normalizeTags(tags: string[]) {
  return Array.from(new Set(tags.map(tag => tag.trim().replace(/\s+/g, " ").slice(0, MAX_TAG_LENGTH)).filter(Boolean))).slice(0, MAX_TAGS);
}
export function validateMemory(value: unknown, categories?: string[]): ExtractedMemory {
  if (!value || typeof value !== "object") throw new Error("记忆格式无效");
  const data = value as Record<string, unknown>;
  const text = (key: string, required = false) => {
    const field = data[key];
    if (typeof field !== "string" || field.length > MAX_MEMORY_TEXT || (required && !field.trim())) throw new Error(`记忆字段 ${key} 无效`);
    return field.trim();
  };
  const category = text("category", true);
  if (categories && !categories.includes(category)) throw new Error("请选择已有分类");
  if (!EMOTIONS.some(item => item.value === data.emotion)) throw new Error("请选择有效情绪");
  if (!Array.isArray(data.tags) || !data.tags.every(tag => typeof tag === "string")) throw new Error("标签格式无效");
  if (typeof data.event_date !== "string" || (data.event_date_end != null && typeof data.event_date_end !== "string")) throw new Error("日期格式无效");
  validateDateRange(data.event_date, data.event_date_end);
  return { title: text("title", true), category, content: text("content", true), result: text("result"),
    emotion: data.emotion as ExtractedMemory["emotion"], emotion_note: text("emotion_note"), tags: normalizeTags(data.tags),
    event_date: normalizeEventDate(data.event_date), event_date_end: data.event_date_end ? normalizeEventDate(data.event_date_end) : null };
}
