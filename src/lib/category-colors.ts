import type { Category } from "@/lib/types";

type CategoryColor = {
  badge: string;
  heatmap: string;
};

const CATEGORY_COLORS: CategoryColor[] = [
  {
    badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
    heatmap: "#d6a33b",
  },
  {
    badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
    heatmap: "#6c94d4",
  },
  {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
    heatmap: "#5ca77a",
  },
  {
    badge: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800",
    heatmap: "#9a82c5",
  },
  {
    badge: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800",
    heatmap: "#c97f91",
  },
  {
    badge: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800",
    heatmap: "#63a9b8",
  },
  {
    badge: "bg-stone-50 text-stone-700 border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700",
    heatmap: "#9d968f",
  },
];

export function getCategoryColor(category: Category) {
  const index = Array.from(category).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}
