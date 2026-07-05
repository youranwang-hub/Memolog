export function currentEventMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * 标准化 event_date：尽可能保留 yyyy-MM-dd，
 * 只有年月时返回 yyyy-MM，完全无法解析才返回 fallback。
 */
export function normalizeEventDate(
  value: unknown,
  fallback: string = currentEventMonth(),
): string {
  if (typeof value !== "string") return fallback;

  const trimmed = value.trim();
  if (!trimmed || trimmed === "未知") return fallback;

  // 已经是 yyyy-MM-dd 或 yyyy-MM → 直接返回（截取前10位防止脏数据）
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // 尝试从各种中文/点号格式提取年月日
  // 匹配 yyyy-MM-dd / yyyy/MM/dd / yyyy.MM.dd
  const fullMatch = trimmed.match(
    /(\d{4})\D{0,3}(\d{1,2})\D{0,3}(\d{1,2})/,
  );
  if (fullMatch) {
    const year = Number(fullMatch[1]);
    const month = Math.max(1, Math.min(12, Number(fullMatch[2])));
    const day = Math.max(1, Math.min(31, Number(fullMatch[3])));
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  // 只有年月（已在前面的正则被 match 捕获，这里是备用）
  const monthMatch = trimmed.match(/(\d{4})\D{0,3}(\d{1,2})/);
  if (monthMatch) {
    const year = Number(monthMatch[1]);
    const month = Math.max(1, Math.min(12, Number(monthMatch[2])));
    return `${year}-${String(month).padStart(2, "0")}`;
  }

  return fallback;
}

/** 从 event_date 提取 yyyy-MM（用于简历等场景） */
export function eventDateToMonth(eventDate: string): string {
  if (!eventDate) return "";
  // yyyy-MM-dd → yyyy-MM
  if (/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
    return eventDate.slice(0, 7);
  }
  // 已经是 yyyy-MM
  if (/^\d{4}-\d{2}$/.test(eventDate)) {
    return eventDate;
  }
  return "";
}

/** 将 event_date 格式化为展示用字符串 */
export function formatEventDate(eventDate: string): string {
  if (!eventDate) return "未知";
  // yyyy-MM-dd → YYYY/MM/DD
  const fullMatch = eventDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (fullMatch) {
    return `${fullMatch[1]}/${Number(fullMatch[2])}/${Number(fullMatch[3])}`;
  }
  // yyyy-MM → YYYY/MM
  const monthMatch = eventDate.match(/^(\d{4})-(\d{2})$/);
  if (monthMatch) {
    return `${monthMatch[1]}/${Number(monthMatch[2])}`;
  }
  return eventDate;
}
