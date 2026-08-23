"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCategoryColor } from "@/lib/category-colors";
import { formatEventDateRange } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { Memory } from "@/lib/types";

function parseEventDay(value?: string | null) {
  if (!value || value === "未知") return null;
  const match = value.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = match[3] ? Number(match[3]) : 1;
  const date = new Date(year, month, day);
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day ? date : null;
}

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

export function MemoryHeatmap({ memories }: { memories: Memory[] }) {
  const years = useMemo(() => getYears(memories), [memories]);
  const currentYear = new Date().getFullYear();
  const preferredYear = years.includes(currentYear) ? currentYear : (years[0] ?? currentYear);
  const [year, setYear] = useState(preferredYear);
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
    <section aria-label="回望">
      <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">{year} 年回望</p>
            <p className="mt-0.5 text-xs text-muted-foreground">沿着时间，找回那些真实发生过的片段。</p>
          </div>
        <div className="flex items-center gap-1 rounded-md border bg-background p-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => previousYear && setYear(previousYear)}
            disabled={!previousYear}
            aria-label="查看上一年"
            title="查看上一年"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-12 text-center text-sm font-medium tabular-nums">{year}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => nextYear && setYear(nextYear)}
            disabled={!nextYear}
            aria-label="查看下一年"
            title="查看下一年"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card/60 p-4">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-2xl font-medium tracking-tight tabular-nums text-foreground/85">{memoryCount}</p>
          <p className="text-right text-xs text-muted-foreground">
            {activeMonths.size} 个活跃月份{mostCommonCategory ? ` · ${mostCommonCategory} 最多` : ""}
          </p>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">这一年留下的经历</p>
        <div className="mt-4 grid grid-cols-12 gap-1.5">
          {Array.from({ length: 12 }, (_, month) => {
            const active = activeMonths.has(month);
            return (
              <button
                key={month}
                type="button"
                disabled={!active}
                onClick={() => scrollToMonth(month)}
                className={cn("flex flex-col items-center gap-1 text-[10px] transition-opacity", active ? "text-foreground hover:opacity-70" : "cursor-default text-muted-foreground/55")}
                aria-label={active ? `跳转至 ${month + 1} 月经历` : `${month + 1} 月没有记录`}
              >
                <span className={cn("h-2 w-2 rounded-full", !active && "bg-muted")} style={active ? { background: "#8b857d" } : undefined} />
                <span>{month + 1}</span>
              </button>
            );
          })}
        </div>
      </div>

      {monthGroups.length === 0 ? (
        <div className="py-14 text-center text-sm text-muted-foreground">这一年还没有可回望的经历。</div>
      ) : (
        <div className="relative mt-7 space-y-8 before:absolute before:bottom-2 before:left-[29px] before:top-2 before:w-px before:bg-border sm:before:left-[37px]">
          {monthGroups.map((group) => (
            <section key={group.month} id={`memory-month-${year}-${group.month}`} className="relative pl-14 sm:pl-20">
              <div className="absolute left-0 top-0 flex w-12 flex-col items-end sm:w-16">
                <span className="text-lg font-medium tabular-nums leading-none text-foreground/75 sm:text-xl">{String(group.month + 1).padStart(2, "0")}</span>
                <span className="mt-1 text-[10px] text-muted-foreground">月</span>
              </div>
              <span className="absolute left-[26px] top-1.5 h-2 w-2 rounded-full border-2 border-background bg-stone-400 sm:left-[34px]" />
              <div className="space-y-2">
                {group.memories.map((memory) => {
                  const color = getCategoryColor(memory.category);
                  const dateLabel = formatTimelineDate(memory);
                  return (
                    <Link key={memory.id} href={`/memory/${memory.id}`} className="group block rounded-lg border bg-background px-3 py-3 transition-colors hover:bg-accent/60">
                      <div className="flex items-start gap-3">
                        <span className="w-11 shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground">{dateLabel}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="truncate text-sm font-medium">{memory.title || "未命名经历"}</p>
                            <Badge variant="outline" className={cn("shrink-0 border text-[10px]", color.badge)}>{memory.category}</Badge>
                          </div>
                          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                            {memory.result || memory.content || formatEventDateRange(memory.event_date, memory.event_date_end)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
