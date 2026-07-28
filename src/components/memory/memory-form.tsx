"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { createMemory } from "@/lib/memories";
import { getAuthHeaders } from "@/lib/api-client";
import { normalizeEventDate, formatEventDateRange } from "@/lib/dates";
import type { ExtractedMemory } from "@/lib/types";
import { getCategories, EMOTIONS } from "@/lib/types";
import { DatePicker } from "@/components/ui/date-picker";

interface Props {
  userId: string;
  categories: string[];
  onSaved: () => void;
}

type DateMode = "single" | "range";
const MAX_TAGS = 8;
const MAX_TAG_LENGTH = 16;

function normalizeTags(tags: string[]) {
  return Array.from(
    new Set(tags.map((tag) => tag.trim().replace(/\s+/g, " ")).filter(Boolean))
  ).slice(0, MAX_TAGS);
}

export function MemoryForm({ userId, categories, onSaved }: Props) {
  const [rawInput, setRawInput] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedMemory | null>(null);
  const [saved, setSaved] = useState(false);
  const [dateMode, setDateMode] = useState<DateMode>("single");
  const [tagInput, setTagInput] = useState("");

  async function handleExtract() {
    if (!rawInput.trim()) return;
    setExtracting(true);

    try {
      const res = await fetch("/api/claude/extract", {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({ rawInput: rawInput.trim() }),
      });
      const data = await res.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setExtracted({ ...data.extracted, tags: normalizeTags(data.extracted.tags ?? []) });
      // 根据 AI 返回是否有 event_date_end 判断日期模式
      setDateMode(data.extracted.event_date_end ? "range" : "single");
      setShowEditor(true);
    } catch {
      toast.error("提炼失败，请稍后重试");
    } finally {
      setExtracting(false);
    }
  }

  function updateField(field: keyof ExtractedMemory, value: string | string[]) {
    if (!extracted) return;
    setExtracted({ ...extracted, [field]: value });
  }

  function addTags(rawValue = tagInput) {
    if (!extracted) return;
    const candidates = rawValue.split(/[,，\n]/).map((tag) => tag.slice(0, MAX_TAG_LENGTH));
    const nextTags = normalizeTags([...extracted.tags, ...candidates]);
    if (nextTags.length === extracted.tags.length && candidates.some((tag) => tag.trim())) {
      toast.error(`每条记忆最多 ${MAX_TAGS} 个标签`);
    }
    updateField("tags", nextTags);
    setTagInput("");
  }

  function removeTag(tag: string) {
    if (!extracted) return;
    updateField("tags", extracted.tags.filter((item) => item !== tag));
  }

  async function handleSave() {
    if (!extracted) return;
    setSaving(true);

    try {
      await createMemory({
        user_id: userId,
        ...extracted,
        event_date: normalizeEventDate(extracted.event_date),
        event_date_end:
          dateMode === "range" && extracted.event_date_end
            ? normalizeEventDate(extracted.event_date_end)
            : null,
        raw_input: rawInput.trim(),
      });

      setSaved(true);
      toast.success("已记录到你的经历库");
      setTimeout(() => {
        setRawInput("");
        setExtracted(null);
        setShowEditor(false);
        setSaved(false);
        setDateMode("single");
        setTagInput("");
        onSaved();
      }, 1000);
    } catch (err) {
      console.error("Save memory error:", err);
      toast.error("保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Card className="bg-card/75 backdrop-blur-sm">
        <CardContent className="p-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <Textarea
                placeholder="不必纠结取舍，履历素材、成长点滴与生活碎片都值得留存；交由 AI 妥帖整理，珍藏每一段过往。"
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleExtract();
                  }
                }}
                rows={2}
                className="resize-none border-0 bg-transparent focus-visible:ring-0 text-sm placeholder:text-muted-foreground/60 p-0"
              />
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleExtract}
              disabled={extracting || !rawInput.trim()}
              className="self-end shrink-0"
            >
              {extracting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showEditor} onOpenChange={(open) => {
        setShowEditor(open);
        if (!open) {
          setExtracted(null);
          setSaved(false);
          setDateMode("single");
          setTagInput("");
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{saved ? "已记录" : "AI 帮你整理好了"}</DialogTitle>
            <DialogDescription>
              {saved
                ? "这条经历已加入你的记忆库"
                : "检查一下，可以修改后再保存"}
            </DialogDescription>
          </DialogHeader>

            {extracted && !saved && (
              <div className="space-y-4">
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
                        value={extracted.event_date}
                        onChange={(val) => updateField("event_date", val)}
                      />
                      {dateMode === "range" && (
                        <DatePicker
                          value={extracted.event_date_end ?? ""}
                          onChange={(val) => updateField("event_date_end", val)}
                          label="结束日期"
                          minDate={extracted.event_date || undefined}
                        />
                      )}
                    </div>
                    {dateMode === "range" && extracted.event_date_end && (
                      <p className="text-xs text-muted-foreground">
                        阶段：{formatEventDateRange(extracted.event_date, extracted.event_date_end)}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                  <Label className="text-xs">分类</Label>
                  <Select
                    value={extracted.category}
                    onValueChange={(v) => updateField("category", v ?? "其他")}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getCategories([...categories, extracted.category]).map((c) => (
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
                  value={extracted.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">成果</Label>
                <Input
                  value={extracted.result}
                  onChange={(e) => updateField("result", e.target.value)}
                  placeholder="如：一等奖 / 完成 / 通过"
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">做了什么</Label>
                <p className="text-xs text-muted-foreground">
                  可以写完整经历，包括背景、你的角色、具体行动和结果。后续生成会更精准。
                </p>
                <Textarea
                  value={extracted.content}
                  onChange={(e) => updateField("content", e.target.value)}
                  rows={5}
                  className="resize-none text-sm"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-xs">标签</Label>
                  <span className="text-[11px] text-muted-foreground">{extracted.tags.length}/{MAX_TAGS}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {extracted.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1 py-1 pl-2">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="rounded-sm hover:text-destructive"
                        aria-label={`删除标签 ${tag}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {extracted.tags.length === 0 && (
                    <span className="text-xs text-muted-foreground">AI 暂未提取标签，可自行补充</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(event) => setTagInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addTags();
                      }
                    }}
                    placeholder="输入标签后按 Enter，可用逗号分隔"
                    maxLength={MAX_TAG_LENGTH * 2 + 1}
                    className="h-8 text-sm"
                    disabled={extracted.tags.length >= MAX_TAGS}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addTags()}
                    disabled={!tagInput.trim() || extracted.tags.length >= MAX_TAGS}
                  >
                    添加
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">情绪</Label>
                <div className="flex flex-wrap gap-1.5">
                  {EMOTIONS.map((e) => (
                    <Badge
                      key={e.value}
                      variant={extracted.emotion === e.value ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => updateField("emotion", e.value)}
                    >
                      {e.emoji} {e.label}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">情绪备注</Label>
                <Input
                  value={extracted.emotion_note}
                  onChange={(e) => updateField("emotion_note", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          )}

          {saved && (
            <div className="flex items-center justify-center py-6">
              <Check className="h-12 w-12 text-emerald-500" />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowEditor(false);
                setSaved(false);
                setDateMode("single");
                setTagInput("");
              }}
            >
              取消
            </Button>
            {!saved && (
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "保存中..." : "确认保存"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
