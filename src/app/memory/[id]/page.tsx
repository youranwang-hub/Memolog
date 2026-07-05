"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Trash2, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Memory, Category, Emotion } from "@/lib/types";
import { CATEGORIES, EMOTIONS, EMOTION_MAP } from "@/lib/types";
import { getMemory, updateMemory, deleteMemory } from "@/lib/memories";
import { normalizeEventDate, formatEventDate, formatEventDateRange, eventDateToMonth } from "@/lib/dates";
import { DatePicker } from "@/components/ui/date-picker";

type DateMode = "single" | "range";

export default function MemoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [memory, setMemory] = useState<Memory | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [dateMode, setDateMode] = useState<DateMode>("single");

  const [form, setForm] = useState({
    event_date: "",
    event_date_end: "" as string,
    category: "其他" as Category,
    title: "",
    result: "",
    content: "",
    emotion: "neutral" as Emotion,
    emotion_note: "",
    tags: [] as string[],
    raw_input: "",
  });

  useEffect(() => {
    getMemory(id)
      .then((data) => {
        setMemory(data);
        const hasRange = !!data.event_date_end;
        setDateMode(hasRange ? "range" : "single");
        setForm({
          event_date: data.event_date,
          event_date_end: data.event_date_end ?? "",
          category: data.category,
          title: data.title,
          result: data.result,
          content: data.content,
          emotion: data.emotion,
          emotion_note: data.emotion_note,
          tags: data.tags,
          raw_input: data.raw_input,
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateMemory(id, {
        ...form,
        event_date: normalizeEventDate(form.event_date),
        event_date_end:
          dateMode === "range" && form.event_date_end
            ? normalizeEventDate(form.event_date_end)
            : null,
      });
      setMemory(updated);
      setEditing(false);
      toast.success("已更新");
    } catch {
      toast.error("保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteMemory(id);
      toast.success("已删除");
      router.push("/dashboard");
    } catch {
      toast.error("删除失败");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin h-6 w-6 border-2 border-stone-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!memory) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">记录不存在</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.push("/dashboard")}>
          返回记忆库
        </Button>
      </div>
    );
  }

  const emotionInfo = EMOTION_MAP[memory.emotion];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          返回
        </Button>
        <div className="flex gap-1">
          {!editing && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              编辑
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setShowDelete(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!editing ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {formatEventDateRange(memory.event_date, memory.event_date_end)}
              </span>
              <span className="text-2xl">{emotionInfo?.emoji}</span>
            </div>
            <CardTitle className="text-xl mt-1">{memory.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary" className="text-xs">
                {memory.category}
              </Badge>
              {memory.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>

            {memory.result && (
              <div>
                <Label className="text-xs text-muted-foreground">成果</Label>
                <p className="text-sm mt-0.5">{memory.result}</p>
              </div>
            )}

            {memory.content && (
              <div>
                <Label className="text-xs text-muted-foreground">做了什么</Label>
                <p className="text-sm mt-0.5 whitespace-pre-wrap leading-relaxed">{memory.content}</p>
              </div>
            )}

            {memory.emotion_note && (
              <div>
                <Label className="text-xs text-muted-foreground">心情</Label>
                <p className="text-sm mt-0.5 text-muted-foreground italic">{memory.emotion_note}</p>
              </div>
            )}

            {memory.raw_input && (
              <div className="pt-4 border-t">
                <Label className="text-xs text-muted-foreground">原始记录</Label>
                <p className="text-xs mt-0.5 text-muted-foreground/60">{memory.raw_input}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4 space-y-4">
              {/* 日期模式切换 + 日期选择 */}
              <div className="space-y-2">
                <Label className="text-xs">日期</Label>
                <div className="flex gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant={dateMode === "single" ? "default" : "outline"}
                    onClick={() => setDateMode("single")}
                    className="text-xs h-7"
                  >
                    单日
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={dateMode === "range" ? "default" : "outline"}
                    onClick={() => setDateMode("range")}
                    className="text-xs h-7"
                  >
                    阶段
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <DatePicker
                    value={form.event_date}
                    onChange={(val) => setForm({ ...form, event_date: val })}
                  />
                  {dateMode === "range" && (
                    <DatePicker
                      value={form.event_date_end}
                      onChange={(val) => setForm({ ...form, event_date_end: val })}
                      label="结束日期"
                      minDate={form.event_date || undefined}
                    />
                  )}
                </div>
                {dateMode === "range" && form.event_date_end && (
                  <p className="text-xs text-muted-foreground">
                    阶段：{formatEventDateRange(form.event_date, form.event_date_end)}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                <Label className="text-xs">分类</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v as Category })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">标题</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">成果</Label>
              <Input
                value={form.result}
                onChange={(e) => setForm({ ...form, result: e.target.value })}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">做了什么</Label>
              <p className="text-xs text-muted-foreground">
                可以写完整经历，包括背景、你的角色、具体行动和结果。后续生成会更精准。
              </p>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={8}
                className="resize-y leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">情绪</Label>
              <div className="flex flex-wrap gap-1.5">
                {EMOTIONS.map((e) => (
                  <Badge
                    key={e.value}
                    variant={form.emotion === e.value ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setForm({ ...form, emotion: e.value })}
                  >
                    {e.emoji} {e.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">情绪备注</Label>
              <Input
                value={form.emotion_note}
                onChange={(e) => setForm({ ...form, emotion_note: e.target.value })}
                className="h-9"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                取消
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                保存
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              删除后无法恢复。确定要删除这条记忆「{memory.title}」吗？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setShowDelete(false)}>
              取消
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
