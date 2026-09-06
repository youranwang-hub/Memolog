export function currentEventMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Preserve unknown dates and reject impossible calendar dates. */
export function normalizeEventDate(value: unknown, fallback = "未知"): string {
  if (typeof value !== "string") return fallback;
  const match = value.trim().match(/^(\d{4})[-/.年](\d{1,2})(?:[-/.月](\d{1,2})日?)?月?$/);
  if (!match) return fallback;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = match[3] ? Number(match[3]) : null;
  if (year < 1000 || month < 1 || month > 12) return fallback;
  if (day !== null && (day < 1 || day > new Date(year, month, 0).getDate())) return fallback;
  return `${year}-${String(month).padStart(2, "0")}${day === null ? "" : `-${String(day).padStart(2, "0")}`}`;
}

export function parseEventDay(value?: string | null): Date | null {
  const normalized = normalizeEventDate(value);
  if (normalized === "未知") return null;
  const [year, month, day = 1] = normalized.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function validateDateRange(start: unknown, end: unknown) {
  for (const value of [start, end]) {
    if (value && value !== "未知" && normalizeEventDate(value) === "未知") {
      throw new Error("请输入有效日期");
    }
  }
  const from = normalizeEventDate(start);
  const to = normalizeEventDate(end);
  if (to !== "未知" && from === "未知") throw new Error("请先选择开始日期");
  if (to !== "未知" && from !== "未知" && (from.length === 7 || to.length === 7 ? to.slice(0, 7) < from.slice(0, 7) : to < from)) {
    throw new Error("结束日期不能早于开始日期");
  }
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

/** 将 event_date 范围格式化为展示用字符串（支持单日或阶段） */
export function formatEventDateRange(
  eventDate: string,
  eventDateEnd?: string | null,
): string {
  const start = formatEventDate(eventDate);
  if (!eventDateEnd) return start;
  const end = formatEventDate(eventDateEnd);
  return `${start} → ${end}`;
}
