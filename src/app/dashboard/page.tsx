"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { MemoryForm } from "@/components/memory/memory-form";
import { MemoryCard } from "@/components/memory/memory-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, X } from "lucide-react";
import type { Memory } from "@/lib/types";
import { CATEGORIES, EMOTIONS } from "@/lib/types";
import { fetchMemories } from "@/lib/memories";

export default function DashboardPage() {
  const { user } = useAuth();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [emotion, setEmotion] = useState<string>("all");

  const loadMemories = useCallback(async () => {
    if (!user) return;
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
    loadMemories();
  }, [loadMemories]);

  const hasFilters = category !== "all" || emotion !== "all" || search.trim() !== "";

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <MemoryForm userId={user.id} onSaved={loadMemories} />

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
        <Select value={category} onValueChange={setCategory}>
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
        <Select value={emotion} onValueChange={setEmotion}>
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
