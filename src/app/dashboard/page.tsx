"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { MemoryForm } from "@/components/memory/memory-form";
import { MemoryCard } from "@/components/memory/memory-card";
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
import { GitFork, Grid2X2, Search, Filter, X } from "lucide-react";
import type { Memory } from "@/lib/types";
import { CATEGORIES, EMOTIONS } from "@/lib/types";
import { fetchMemories } from "@/lib/memories";
import { fetchProfile } from "@/lib/profile";

export default function DashboardPage() {
  const { user } = useAuth();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [emotion, setEmotion] = useState<string>("all");
  const [view, setView] = useState<"grid" | "graph">("grid");
  const [showProfileNudge, setShowProfileNudge] = useState(false);

  const loadMemories = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchMemories({
        category: category !== "all" ? category : undefined,
        emotion: emotion !== "all" ? emotion : undefined,
        search: search.trim() || undefined,
      });
      setMemories(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user, category, emotion, search]);

  useEffect(() => {
    let active = true;

    async function run() {
      if (!user) return;
      setLoading(true);
      try {
        const data = await fetchMemories({
          category: category !== "all" ? category : undefined,
          emotion: emotion !== "all" ? emotion : undefined,
          search: search.trim() || undefined,
        });
        if (active) setMemories(data);
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
  }, [user, category, emotion, search]);

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
        if (active) setShowProfileNudge(!hasProfile);
      } catch {
        if (active) setShowProfileNudge(false);
      }
    }

    void loadProfileState();

    return () => {
      active = false;
    };
  }, [user]);

  const hasFilters = category !== "all" || emotion !== "all" || search.trim() !== "";

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <MemoryForm userId={user.id} onSaved={loadMemories} />

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
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={emotion} onValueChange={(v) => setEmotion(v ?? "all")}>
          <SelectTrigger className="h-8 w-[90px] text-sm">
            <SelectValue placeholder="情绪" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部情绪</SelectItem>
            {EMOTIONS.map((e) => (
              <SelectItem key={e.value} value={e.value}>
                {e.emoji} {e.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              setSearch("");
              setCategory("all");
              setEmotion("all");
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
            {view === "graph" ? "从分类、标签和经历之间看见自己的成长路径" : `${memories.length} 条记录`}
          </p>
        </div>
        <div className="flex rounded-md border bg-background p-0.5">
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
