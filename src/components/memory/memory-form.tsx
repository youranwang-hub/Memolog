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
import { Plus, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { createMemory } from "@/lib/memories";
import { getAuthHeaders } from "@/lib/api-client";
import type { ExtractedMemory } from "@/lib/types";
import { CATEGORIES, EMOTIONS } from "@/lib/types";

interface Props {
  userId: string;
  onSaved: () => void;
}

export function MemoryForm({ userId, onSaved }: Props) {
  const [rawInput, setRawInput] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedMemory | null>(null);
  const [saved, setSaved] = useState(false);

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

      setExtracted(data.extracted);
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

  async function handleSave() {
    if (!extracted) return;
    setSaving(true);

    try {
      await createMemory({
        user_id: userId,
        ...extracted,
        raw_input: rawInput.trim(),
      });

      setSaved(true);
      toast.success("已记录到你的经历库");
      setTimeout(() => {
        setRawInput("");
        setExtracted(null);
        setShowEditor(false);
        setSaved(false);
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
                placeholder="今天做了什么？直接写下来，AI 帮你整理…"
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

      <Dialog open={showEditor} onOpenChange={setShowEditor}>
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">日期</Label>
                  <Input
                    value={extracted.event_date}
                    onChange={(e) => updateField("event_date", e.target.value)}
                    placeholder="2026-06"
                    className="h-8 text-sm"
                  />
                </div>
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
                <Textarea
                  value={extracted.content}
                  onChange={(e) => updateField("content", e.target.value)}
                  rows={2}
                  className="resize-none text-sm"
                />
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
