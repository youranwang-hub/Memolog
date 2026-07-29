"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { MemoryForm } from "@/components/memory/memory-form";
import { MemoryCard } from "@/components/memory/memory-card";
import { MemoryHeatmap } from "@/components/memory/memory-heatmap";
import { MemoryGraph } from "@/components/memory/memory-graph";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays, GitFork, Grid2X2, Search, Filter, X } from "lucide-react";
import type { Memory } from "@/lib/types";
import { getCategories } from "@/lib/types";
import { fetchMemories } from "@/lib/memories";
import { fetchProfile } from "@/lib/profile";

type TimeFilter = "all" | "unknown" | `month:${string}` | `year:${string}`;

function parseEventDate(value: string) {
  if (!value || value === "未知") return null;
  // yyyy-MM-dd 或 yyyy-MM 都支持
  const match = value.match(/^(\d{4})-(\d{2})/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;

  return new Date(year, Math.max(0, Math.min(month, 11)), 1);
}

function getEventMonthKey(memory: Memory) {
  const eventDate = parseEventDate(memory.event_date);
  if (!eventDate) return null;

  const year = eventDate.getFullYear();
  const month = String(eventDate.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getEventYearKey(memory: Memory) {
  const eventDate = parseEventDate(memory.event_date);
  return eventDate ? String(eventDate.getFullYear()) : null;
}

function formatMonthLabel(value: string) {
  const [year, month] = value.split("-");
  return `${year}年${Number(month)}月`;
}

function matchesTimeFilter(memory: Memory, filter: TimeFilter) {
  if (filter === "all") return true;

  const eventDate = parseEventDate(memory.event_date);
  if (filter === "unknown") return !eventDate;
  if (!eventDate) return false;

  if (filter.startsWith("month:")) {
    return getEventMonthKey(memory) === filter.replace("month:", "");
  }

  return getEventYearKey(memory) === filter.replace("year:", "");
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [baseMemories, setBaseMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [view, setView] = useState<"heatmap" | "grid" | "graph">("heatmap");
  const [showProfileNudge, setShowProfileNudge] = useState(false);
  const [categories, setCategories] = useState<string[]>(getCategories());

  const loadMemories = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchMemories({
        category: category !== "all" ? category : undefined,
        search: search.trim() || undefined,
      });
      setBaseMemories(data);
      setMemories(data.filter((memory) => matchesTimeFilter(memory, timeFilter)));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user, category, search, timeFilter]);

  useEffect(() => {
    let active = true;

    async function run() {
      if (!user) return;
      setLoading(true);
      try {
        const data = await fetchMemories({
          category: category !== "all" ? category : undefined,
          search: search.trim() || undefined,
        });
        if (active) {
          setBaseMemories(data);
          setMemories(data.filter((memory) => matchesTimeFilter(memory, timeFilter)));
        }
      } catch {
        // silent
      } finally {
        if (active) setLoading(false);
      }
    }

    void run();

    return () => {
      active = false;
    };
  }, [user, category, search, timeFilter]);

  useEffect(() => {
    let active = true;

    async function loadProfileState() {
      if (!user) return;
      try {
        const profile = await fetchProfile(user.id);
        const hasProfile =
          !!profile?.display_name ||
          !!profile?.real_name ||
          !!profile?.identity_stage ||
          !!profile?.school ||
          !!profile?.major;
        if (active) {
          setShowProfileNudge(!hasProfile);
          setCategories(getCategories(profile?.custom_categories));
        }
      } catch {
        if (active) setShowProfileNudge(false);
      }
    }

    void loadProfileState();

    return () => {
      active = false;
    };
  }, [user]);

  const hasFilters =
    category !== "all" || (view !== "heatmap" && timeFilter !== "all") || search.trim() !== "";
  const timeOptions = useMemo(() => {
    const monthKeys = Array.from(
      new Set(baseMemories.map(getEventMonthKey).filter((value): value is string => Boolean(value)))
    ).sort((a, b) => b.localeCompare(a));
    const hasUnknown = baseMemories.some((memory) => !parseEventDate(memory.event_date));

    if (monthKeys.length > 12) {
      const years = Array.from(new Set(monthKeys.map((key) => key.slice(0, 4)))).sort((a, b) =>
        b.localeCompare(a)
      );
      return [
        { value: "all" as TimeFilter, label: "全部时间" },
        ...years.map((year) => ({ value: `year:${year}` as TimeFilter, label: `${year}年` })),
        ...(hasUnknown ? [{ value: "unknown" as TimeFilter, label: "时间未知" }] : []),
      ];
    }

    return [
      { value: "all" as TimeFilter, label: "全部时间" },
      ...monthKeys.map((month) => ({
        value: `month:${month}` as TimeFilter,
        label: formatMonthLabel(month),
      })),
      ...(hasUnknown ? [{ value: "unknown" as TimeFilter, label: "时间未知" }] : []),
    ];
  }, [baseMemories]);

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <MemoryForm userId={user.id} categories={categories} onSaved={loadMemories} />

      {showProfileNudge && (
        <div className="rounded-md border bg-card/75 p-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">让 Memolog 更认识你一点</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              补充称呼、学校、专业和目标方向后，生成内容会更贴近你。
            </p>
          </div>
          <Link
            href="/profile"
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-background px-3 text-sm hover:bg-accent hover:text-accent-foreground"
          >
            完善档案
          </Link>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="搜索记忆..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
        <Select value={category} onValueChange={(v) => setCategory(v ?? "all")}>
          <SelectTrigger className="h-8 w-[90px] text-sm">
            <Filter className="h-3 w-3 mr-1" />
            <SelectValue placeholder="分类" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分类</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {view !== "heatmap" && (
          <Select value={timeFilter} onValueChange={(v) => setTimeFilter((v ?? "all") as TimeFilter)}>
            <SelectTrigger className="h-8 w-[98px] text-sm">
              <SelectValue placeholder="时间" />
            </SelectTrigger>
            <SelectContent>
              {timeOptions.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              setSearch("");
              setCategory("all");
              setTimeFilter("all");
            }}
          >
            <X className="h-3 w-3 mr-1" />
            清除
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-medium">记忆库</h1>
          <p className="text-xs text-muted-foreground">
            {view === "heatmap"
              ? "按经历发生日期回望这一年"
              : view === "graph"
                ? "从分类、标签和经历之间看见自己的成长路径"
                : `${memories.length} 条记录`}
          </p>
        </div>
        <div className="flex rounded-md border bg-background p-0.5">
          <Button
            variant={view === "heatmap" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 px-2"
            onClick={() => setView("heatmap")}
            aria-label="回望视图"
          >
            <CalendarDays className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">回望</span>
          </Button>
          <Button
            variant={view === "grid" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 px-2"
            onClick={() => setView("grid")}
            aria-label="卡片视图"
          >
            <Grid2X2 className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">卡片</span>
          </Button>
          <Button
            variant={view === "graph" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 px-2"
            onClick={() => setView("graph")}
            aria-label="图谱视图"
          >
            <GitFork className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">图谱</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-6 w-6 border-2 border-stone-400 border-t-transparent rounded-full" />
        </div>
      ) : view === "heatmap" ? (
        <MemoryHeatmap memories={baseMemories} />
      ) : memories.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <p className="text-muted-foreground text-sm">
            {hasFilters
              ? "没有匹配的记录"
              : "还没有记录，把今天做的第一件事告诉我吧"}
          </p>
        </div>
      ) : view === "graph" ? (
        <MemoryGraph memories={memories} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {memories.map((m) => (
            <MemoryCard key={m.id} memory={m} />
          ))}
        </div>
      )}
    </div>
  );
}
