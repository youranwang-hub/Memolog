"use client";

import { CategoryLabel } from "@/components/memory/category-label";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseEventDay, formatEventDateRange } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { Memory } from "@/lib/types";

function getYears(memories: Memory[]) {
  const years = new Set<number>();
  for (const memory of memories) {
    const start = parseEventDay(memory.event_date);
    const end = parseEventDay(memory.event_date_end);
    if (start) years.add(start.getFullYear());
    if (end) years.add(end.getFullYear());
  }
  return Array.from(years).sort((a, b) => b - a);
}

function formatTimelineDate(memory: Memory) {
  const start = parseEventDay(memory.event_date);
  const end = parseEventDay(memory.event_date_end);
  if (!start || !end) {
    return start && /^\d{4}-\d{2}-\d{2}$/.test(memory.event_date)
      ? `${start.getDate()} 日`
      : "当月";
  }

  const startLabel = `${start.getMonth() + 1}.${start.getDate()}`;
  const endLabel = `${end.getMonth() + 1}.${end.getDate()}`;
  return `${startLabel}–${endLabel}`;
}

export function MemoryTimeline({ memories }: { memories: Memory[] }) {
  const years = useMemo(() => getYears(memories), [memories]);
  const currentYear = new Date().getFullYear();
  const preferredYear = years.includes(currentYear) ? currentYear : (years[0] ?? currentYear);
  const [selectedYear, setYear] = useState(preferredYear);
  const year = years.includes(selectedYear) ? selectedYear : preferredYear;
  const undated = memories.filter(memory => !parseEventDay(memory.event_date));
  const previousYear = years.find((value) => value < year);
  const nextYear = years.slice().reverse().find((value) => value > year && value <= currentYear);
  const monthGroups = useMemo(() => {
    const groups = new Map<number, Memory[]>();
    for (const memory of memories) {
      const date = parseEventDay(memory.event_date);
      if (!date || date.getFullYear() !== year) continue;
      const entries = groups.get(date.getMonth()) ?? [];
      entries.push(memory);
      groups.set(date.getMonth(), entries);
    }
    return Array.from(groups, ([month, entries]) => ({
      month,
      memories: entries.sort((a, b) => a.event_date.localeCompare(b.event_date)),
    })).sort((a, b) => a.month - b.month);
  }, [memories, year]);

  const activeMonths = new Set(monthGroups.map((group) => group.month));
  const memoryCount = monthGroups.reduce((count, group) => count + group.memories.length, 0);
  const mostCommonCategory = Array.from(
    monthGroups.flatMap((group) => group.memories).reduce((counts, memory) => {
      counts.set(memory.category, (counts.get(memory.category) ?? 0) + 1);
      return counts;
    }, new Map<string, number>())
  ).sort(([, countA], [, countB]) => countB - countA)[0]?.[0];

  function scrollToMonth(month: number) {
    document.getElementById(`memory-month-${year}-${month}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <section aria-label="经历回望" className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{memoryCount} 段经历 · {activeMonths.size} 个有记录的月份{mostCommonCategory ? ` · ${mostCommonCategory} 最多` : ""}</p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={() => previousYear && setYear(previousYear)} disabled={!previousYear} aria-label="上一年"><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm tabular-nums">{year}</span>
          <Button variant="ghost" size="icon-sm" onClick={() => nextYear && setYear(nextYear)} disabled={!nextYear} aria-label="下一年"><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-12 border-b pb-3">
        {Array.from({ length: 12 }, (_, month) => (
          <button key={month} type="button" disabled={!activeMonths.has(month)} onClick={() => scrollToMonth(month)}
            className={cn("mx-auto flex h-9 w-full max-w-10 items-center justify-center rounded-sm text-xs tabular-nums transition-colors", activeMonths.has(month) ? "text-primary hover:bg-accent font-medium" : "text-muted-foreground/50")}
            aria-label={`${month + 1} 月${activeMonths.has(month) ? "，查看经历" : "，暂无记录"}`}>
            {String(month + 1).padStart(2, "0")}
          </button>
        ))}
      </div>
      {monthGroups.length === 0 && <p className="py-14 text-center text-sm text-muted-foreground">这一年的纸页，等你慢慢写下。</p>}
      {monthGroups.map(group => (
        <section key={group.month} id={`memory-month-${year}-${group.month}`} className="timeline-month scroll-mt-24">
          <div><p className="timeline-month-label">{String(group.month + 1).padStart(2, "0")}</p><p className="mt-1 text-[10px] text-muted-foreground">月</p></div>
          <div className="min-w-0 border-t">
            {group.memories.map(memory => (
              <Link key={memory.id} href={`/memory/${memory.id}`} className="timeline-entry">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3 className="min-w-0 break-words text-base font-medium leading-7">{memory.title || "未命名经历"}</h3>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatTimelineDate(memory)}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-7 text-muted-foreground">{memory.result || memory.content || formatEventDateRange(memory.event_date, memory.event_date_end)}</p>
                <p className="mt-3 text-[11px] text-muted-foreground"><CategoryLabel category={memory.category} />{memory.tags.length > 0 ? ` · ${memory.tags.slice(0, 2).join(" / ")}` : ""}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
      {undated.length > 0 && <details className="mt-8 border-t py-5"><summary className="cursor-pointer text-sm text-muted-foreground">日期待补充 · {undated.length} 条</summary><div className="mt-3">{undated.map(memory => <Link className="timeline-entry text-sm" key={memory.id} href={`/memory/${memory.id}`}>{memory.title}</Link>)}</div></details>}
    </section>
  );
}
