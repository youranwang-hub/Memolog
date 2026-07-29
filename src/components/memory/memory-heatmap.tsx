"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getCategoryColor } from "@/lib/category-colors";
import type { Memory } from "@/lib/types";

type DaySummary = {
  date: Date;
  memories: Memory[];
};

const WEEKDAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

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

function formatDay(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
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

function buildWeeks(year: number) {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  const startOffset = (start.getDay() + 6) % 7;
  const endOffset = 6 - ((end.getDay() + 6) % 7);
  const first = new Date(year, 0, 1 - startOffset);
  const last = new Date(year, 11, 31 + endOffset);
  const weeks: Date[][] = [];

  for (let current = new Date(first); current <= last; current.setDate(current.getDate() + 7)) {
    weeks.push(
      Array.from({ length: 7 }, (_, index) => {
        const date = new Date(current);
        date.setDate(current.getDate() + index);
        return date;
      })
    );
  }

  return weeks;
}

function getHeatmapData(memories: Memory[], year: number) {
  const days = new Map<string, DaySummary>();
  const first = new Date(year, 0, 1);
  const last = new Date(year, 11, 31);

  function addMemory(date: Date, memory: Memory) {
    if (date < first || date > last) return;
    const key = dayKey(date);
    const summary = days.get(key) ?? { date: new Date(date), memories: [] };
    summary.memories.push(memory);
    days.set(key, summary);
  }

  for (const memory of memories) {
    const start = parseEventDay(memory.event_date);
    if (!start) continue;
    const end = parseEventDay(memory.event_date_end) ?? start;
    const rangeStart = start <= end ? start : end;
    const rangeEnd = start <= end ? end : start;
    const isRange = dayKey(rangeStart) !== dayKey(rangeEnd);
    addMemory(rangeStart, memory);
    if (isRange) addMemory(rangeEnd, memory);
  }

  return days;
}

export function MemoryHeatmap({ memories }: { memories: Memory[] }) {
  const years = useMemo(() => getYears(memories), [memories]);
  const currentYear = new Date().getFullYear();
  const preferredYear = years.includes(currentYear) ? currentYear : (years[0] ?? currentYear);
  const [year, setYear] = useState(preferredYear);
  const [selectedDay, setSelectedDay] = useState<DaySummary | null>(null);

  const weeks = useMemo(() => buildWeeks(year), [year]);
  const heatmapData = useMemo(() => getHeatmapData(memories, year), [memories, year]);
  const monthPositions = useMemo(
    () =>
      MONTH_LABELS.map((label, month) => {
        const firstDay = new Date(year, month, 1);
        const week = weeks.findIndex((days) => days.some((day) => dayKey(day) === dayKey(firstDay)));
        return { label, week };
      }).filter((month) => month.week >= 0),
    [weeks, year]
  );

  function getDayBackground(summary?: DaySummary) {
    if (!summary) return "#f2f0eb";
    const colors = Array.from(new Set(summary.memories.map((memory) => getCategoryColor(memory.category).heatmap)));
    if (colors.length === 1) return colors[0];
    return `linear-gradient(90deg, ${colors[0]} 0 50%, ${colors[1]} 50% 100%)`;
  }

  const selectedMemories = selectedDay
    ? Array.from(new Map(selectedDay.memories.map((memory) => [memory.id, memory])).values())
    : [];

  return (
    <section aria-label="回望">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">经历足迹</p>
        <div className="flex items-center gap-1 rounded-md border bg-background p-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setYear((value) => value - 1)}
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
            onClick={() => setYear((value) => value + 1)}
            aria-label="查看下一年"
            title="查看下一年"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="w-full max-w-full overflow-x-auto overscroll-x-contain pb-1">
        <div className="w-fit [--heatmap-cell:10px] sm:[--heatmap-cell:12px] lg:[--heatmap-cell:14px]">
          <div className="ml-8 grid h-4 gap-[2px] text-[10px] text-muted-foreground sm:gap-1" style={{ gridTemplateColumns: `repeat(${weeks.length}, var(--heatmap-cell))` }}>
            {monthPositions.map(({ label, week }) => (
              <span key={label} style={{ gridColumnStart: week + 1 }} className="whitespace-nowrap">
                {label}
              </span>
            ))}
          </div>
          <div className="mt-1 flex gap-[2px] sm:gap-1">
            <div className="grid w-6 grid-rows-7 gap-[2px] text-right text-[10px] leading-[var(--heatmap-cell)] text-muted-foreground sm:gap-1">
              {WEEKDAY_LABELS.map((label, index) => (
                <span key={`${label}-${index}`}>{label}</span>
              ))}
            </div>
            <div className="grid grid-flow-col grid-rows-7 gap-[2px] sm:gap-1">
              {weeks.flatMap((week) =>
                week.map((date) => {
                  const inYear = date.getFullYear() === year;
                  const summary = inYear ? heatmapData.get(dayKey(date)) : undefined;
                  const count = summary?.memories.length ?? 0;
                  return (
                    <button
                      key={dayKey(date)}
                      type="button"
                      disabled={!summary}
                      onClick={() => summary && setSelectedDay(summary)}
                      title={
                        inYear
                          ? `${formatDay(date)}${count ? `：${count} 条经历` : "：暂无经历"}`
                          : undefined
                      }
                      aria-label={
                        inYear
                          ? `${formatDay(date)}${count ? `，${count} 条经历` : "，暂无经历"}`
                          : undefined
                      }
                      className="h-[var(--heatmap-cell)] w-[var(--heatmap-cell)] rounded-[3px] transition-opacity enabled:hover:opacity-75 disabled:cursor-default"
                      style={{ background: inYear ? getDayBackground(summary) : "transparent" }}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={Boolean(selectedDay)} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedDay ? formatDay(selectedDay.date) : ""}</DialogTitle>
            <DialogDescription>当天关联的记忆</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {selectedMemories.map((memory) => (
              <Link
                key={memory.id}
                href={`/memory/${memory.id}`}
                className="block rounded-md border px-3 py-2 transition-colors hover:bg-accent"
              >
                <p className="text-sm font-medium">{memory.title || "未命名记忆"}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{memory.content}</p>
              </Link>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
