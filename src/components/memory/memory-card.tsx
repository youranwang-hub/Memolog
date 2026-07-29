"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Memory } from "@/lib/types";
import { EMOTION_MAP } from "@/lib/types";
import { Calendar, Tag } from "lucide-react";
import { getCategoryColor } from "@/lib/category-colors";
import { cn } from "@/lib/utils";
import { formatEventDateRange } from "@/lib/dates";

interface Props {
  memory: Memory;
  onDelete?: (id: string) => void;
}

export function MemoryCard({ memory }: Props) {
  const emotionInfo = EMOTION_MAP[memory.emotion];

  const categoryColor = getCategoryColor(memory.category);

  return (
    <Link href={`/memory/${memory.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer group h-full">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{formatEventDateRange(memory.event_date, memory.event_date_end)}</span>
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
              className={cn("text-xs border", categoryColor.badge)}
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
