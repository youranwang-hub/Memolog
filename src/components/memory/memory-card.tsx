"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Memory } from "@/lib/types";
import { EMOTION_MAP, CATEGORIES } from "@/lib/types";
import { Calendar, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatEventDate } from "@/lib/dates";

interface Props {
  memory: Memory;
  onDelete?: (id: string) => void;
}

export function MemoryCard({ memory }: Props) {
  const emotionInfo = EMOTION_MAP[memory.emotion];

  const categoryIndex = CATEGORIES.indexOf(memory.category) % 7;
  const categoryColors = [
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
    "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800",
    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800",
    "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800",
    "bg-stone-50 text-stone-700 border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700",
  ];

  return (
    <Link href={`/memory/${memory.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer group h-full">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{formatEventDate(memory.event_date)}</span>
            </div>
            <span className="text-lg" title={emotionInfo?.label}>
              {emotionInfo?.emoji ?? "😐"}
            </span>
          </div>

          <div>
            <h3 className="font-medium text-sm leading-tight">{memory.title}</h3>
            {memory.result && (
              <p className="text-xs text-muted-foreground mt-0.5">{memory.result}</p>
            )}
          </div>

          {memory.content && (
            <p className="text-xs text-muted-foreground line-clamp-2">{memory.content}</p>
          )}

          <div className="flex flex-wrap gap-1.5">
            <Badge
              variant="outline"
              className={cn("text-xs border", categoryColors[categoryIndex])}
            >
              {memory.category}
            </Badge>
            {memory.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center text-xs text-muted-foreground"
              >
                <Tag className="h-2.5 w-2.5 mr-0.5" />
                {tag}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
