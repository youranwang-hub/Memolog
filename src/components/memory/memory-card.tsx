"use client";

import { CategoryLabel } from "@/components/memory/category-label";
import Link from "next/link";
import type { Memory } from "@/lib/types";
import { EMOTION_MAP } from "@/lib/types";
import { formatEventDateRange } from "@/lib/dates";

export function MemoryCard({ memory }: { memory: Memory }) {
  return (
    <Link href={`/memory/${memory.id}`} className="memory-row" onClick={() => sessionStorage.setItem("memolog-library-scroll", String(window.scrollY))}>
      <span className="memory-row-date">{formatEventDateRange(memory.event_date, memory.event_date_end)}</span>
      <div className="min-w-0 flex flex-1 flex-col">
        <h3 className="line-clamp-2">{memory.title || "未命名经历"}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{memory.result || memory.content}</p>
        <div className="memory-row-meta">
          <CategoryLabel category={memory.category} />
          {memory.tags.slice(0, 2).map(tag => <span key={tag}># {tag}</span>)}
          {memory.emotion !== "neutral" && <span>{EMOTION_MAP[memory.emotion]?.label}</span>}
        </div>
      </div>
    </Link>
  );
}
