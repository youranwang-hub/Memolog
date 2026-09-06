import { DEFAULT_CATEGORIES, type Category } from "@/lib/types";

// Fixed default assignments keep category colors consistent across every view.
const CATEGORY_COLORS = [
  { badge: "category-ochre", heatmap: "#AA8A54" },
  { badge: "category-slate", heatmap: "#7B929F" },
  { badge: "category-sage", heatmap: "#869578" },
  { badge: "category-mauve", heatmap: "#A18AA6" },
  { badge: "category-clay", heatmap: "#BD8975" },
  { badge: "category-teal", heatmap: "#72978E" },
  { badge: "category-stone", heatmap: "#9A9186" },
];

export function getCategoryColor(category: Category) {
  const defaultIndex = DEFAULT_CATEGORIES.findIndex((name) => name === category);
  const hash = Array.from(category).reduce((value, char) => (value * 31 + char.codePointAt(0)!) >>> 0, 0);
  return CATEGORY_COLORS[defaultIndex >= 0 ? defaultIndex : hash % CATEGORY_COLORS.length];
}
