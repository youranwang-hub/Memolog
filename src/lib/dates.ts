export function currentEventMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function normalizeEventDate(value: unknown, fallback = currentEventMonth()) {
  if (typeof value !== "string") return fallback;

  const trimmed = value.trim();
  if (!trimmed || trimmed === "未知") return fallback;

  const match = trimmed.match(/(\d{4})\D{0,3}(\d{1,2})?/);
  if (!match) return fallback;

  const year = Number(match[1]);
  const month = match[2] ? Number(match[2]) : new Date().getMonth() + 1;

  if (!Number.isFinite(year) || !Number.isFinite(month)) return fallback;

  const safeMonth = Math.max(1, Math.min(12, month));
  return `${year}-${String(safeMonth).padStart(2, "0")}`;
}
