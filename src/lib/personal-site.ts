import { PERSONAL_SITE_SECTIONS, type PersonalSiteMemory } from "@/lib/types";

export const PERSONAL_SITE_DATA_PATH = "data/memories.json";

export function publicSitePayload(items: PersonalSiteMemory[]) {
  return {
    updatedAt: new Date().toISOString(),
    memories: items
      .filter((item) => item.is_public)
      .sort((a, b) => b.event_date.localeCompare(a.event_date) || b.updated_at.localeCompare(a.updated_at))
      .map(({ site_section, title, summary, body, category, tags, event_date, event_date_end, cover_image_url, publish_cover_image, published_at }) => ({
        site_section, title, summary, body, category, tags, event_date, event_date_end: event_date_end ?? null,
        cover_image_url: publish_cover_image ? cover_image_url ?? null : null,
        published_at: published_at ?? null,
      })),
  };
}

export function validatePersonalSiteMemory(value: unknown) {
  if (!value || typeof value !== "object") throw new Error("公开版本格式无效");
  const data = value as Record<string, unknown>;
  const text = (key: string, max: number, required = false) => {
    const field = data[key];
    if (typeof field !== "string" || field.length > max || (required && !field.trim())) throw new Error(`公开版本字段 ${key} 无效`);
    return field.trim();
  };
  if (!Array.isArray(data.tags) || !data.tags.every((tag) => typeof tag === "string")) throw new Error("公开版本标签无效");
  if (!PERSONAL_SITE_SECTIONS.some((section) => section.value === data.site_section)) throw new Error("请选择要发布的网站栏目");
  const cover = data.cover_image_url;
  if (cover != null && (typeof cover !== "string" || cover.length > 2000 || !/^https:\/\//.test(cover))) throw new Error("封面图片地址无效");
  return {
    is_public: data.is_public === true,
    site_section: data.site_section as PersonalSiteMemory["site_section"],
    title: text("title", 120, true), summary: text("summary", 360, true), body: text("body", 12000, true),
    category: text("category", 40, true), tags: Array.from(new Set(data.tags.map((tag) => tag.trim()).filter(Boolean))).slice(0, 8),
    event_date: text("event_date", 20, true), event_date_end: typeof data.event_date_end === "string" ? text("event_date_end", 20) || null : null,
    cover_image_url: typeof cover === "string" ? cover : null, publish_cover_image: data.publish_cover_image === true,
  };
}
