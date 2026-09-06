import { getCategoryColor } from "@/lib/category-colors";

export function CategoryLabel({ category }: { category: string }) {
  return <span className={`category-label ${getCategoryColor(category).badge}`}>
    <span className="category-dot" aria-hidden="true" />{category}
  </span>;
}
