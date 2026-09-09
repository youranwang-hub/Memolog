"use client";
import { TagEditor } from "@/components/memory/tag-editor";
import { validateMemory } from "@/lib/memory-validation";


import { useState, useRef, useEffect } from "react";
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
import { ChevronUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createMemory } from "@/lib/memories";
import { fetchWithAuth } from "@/lib/api-client";
import { normalizeEventDate } from "@/lib/dates";
import type { ExtractedMemory } from "@/lib/types";
import { getCategories, EMOTIONS } from "@/lib/types";
import { DateFields } from "@/components/memory/date-fields";
import { MemoryImagePicker, type PendingMemoryImage } from "@/components/memory/memory-image-picker";
import { uploadMemoryAttachments } from "@/lib/memory-attachments";

interface Props {
  userId: string;
  categories: string[];
  onSaved: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

type DateMode = "single" | "range";

export function MemoryForm({ userId, categories, onSaved, mobileOpen = false, onMobileClose }: Props) {
  const busy = useRef(false);
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => () => requestRef.current?.abort(), []);
  const [rawInput, setRawInput] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedMemory | null>(null);
  const [dateMode, setDateMode] = useState<DateMode>("single");
  const [processingImages, setProcessingImages] = useState(false);
  const [pendingImages, setPendingImages] = useState<PendingMemoryImage[]>([]);

  async function handleExtract() {
    if (!rawInput.trim() || busy.current || processingImages) return;
    busy.current = true;
    requestRef.current = new AbortController();
    setExtracting(true);

    try {
      const res = await fetchWithAuth("/api/deepseek/extract", {
        method: "POST",
        signal: requestRef.current.signal,
        body: JSON.stringify({ rawInput: rawInput.trim() }),
      });
      const data = await res.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setExtracted(validateMemory(data.extracted));
      // 根据 AI 返回是否有 event_date_end 判断日期模式
      setDateMode(data.extracted.event_date_end ? "range" : "single");
      setShowEditor(true);
    } catch (error) {
      if (!requestRef.current?.signal.aborted) toast.error(error instanceof Error ? error.message : "提炼失败，请稍后重试");
    } finally {
      busy.current = false;
      setExtracting(false);
    }
  }

  function updateField(field: keyof ExtractedMemory, value: string | string[]) {
    if (!extracted) return;
    setExtracted({ ...extracted, [field]: value });
  }


  async function handleSave() {
    if (!extracted || busy.current || processingImages) return;
    busy.current = true;
    setSaving(true);

    try {
      const memory = await createMemory({
        user_id: userId,
        ...validateMemory({ ...extracted, event_date_end: dateMode === "range" ? extracted.event_date_end : null }),
        event_date: normalizeEventDate(extracted.event_date),
        event_date_end:
          dateMode === "range" && extracted.event_date_end
            ? normalizeEventDate(extracted.event_date_end)
            : null,
        raw_input: rawInput.trim(),
      });

      let imageUploadFailed = false;
      if (pendingImages.length > 0) {
        try {
          await uploadMemoryAttachments({
            memoryId: memory.id,
            userId,
            files: pendingImages.map((image) => image.file),
          });
        } catch (imageError) {
          imageUploadFailed = true;
          console.error("Upload memory images error:", imageError);
        }
      }

      if (imageUploadFailed) {
        toast.warning("经历已保存，但图片上传失败，可在详情页稍后补充");
      } else {
        toast.success("已记录到你的经历库");
      }

        setRawInput("");
        setExtracted(null);
        setShowEditor(false);
        setDateMode("single");
        setPendingImages([]);
        onSaved();
        onMobileClose?.();

    } catch (err) {
      console.error("Save memory error:", err);
      toast.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  return (
    <>
      <Card className={`journal-composer${mobileOpen ? " is-mobile-open" : ""}`}>
        <CardContent className="p-3">
          <div className="flex flex-col gap-3">
            <div className="flex-1">
              <Textarea
                placeholder="写下此刻，或想起的一段经历。"
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    handleExtract();
                  }
                }}
                rows={3}
                className="resize-none border-0 bg-transparent focus-visible:ring-0 text-sm placeholder:text-muted-foreground/60 p-0"
              />
            </div>
          </div>
          <div className="composer-footer">
          <MemoryImagePicker
            images={pendingImages}
            onChange={setPendingImages}
            onProcessingChange={setProcessingImages}
            disabled={extracting || saving}
            compact
          />
            <Button
              size="sm"
              variant="default"
              onClick={handleExtract}
              disabled={extracting || processingImages || !rawInput.trim()}
              className="h-9 px-4 shrink-0"
            >
              {extracting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span>整理记录</span>
              )}
            </Button>
            <Button type="button" variant="ghost" size="sm" className="mobile-composer-close" onClick={onMobileClose}>
              收起 <ChevronUp className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Button className="mt-2 text-xs text-muted-foreground" variant="ghost" size="sm" disabled={!rawInput.trim() || extracting || saving || processingImages} onClick={() => {
        setExtracted({ title: rawInput.trim().slice(0, 30), content: rawInput.trim(), result: "", category: categories[0] || "其他", event_date: "未知", event_date_end: null, emotion: "neutral", emotion_note: "", tags: [] });
        setShowEditor(true);
      }}>直接记录，稍后整理</Button>
      <Dialog open={showEditor} onOpenChange={(open) => {
        if (saving) return;
        setShowEditor(open);
        if (!open) {
          setExtracted(null);
          setDateMode("single");

        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>确认这条记忆</DialogTitle>
            <DialogDescription>
              检查一下，可以修改后再保存
            </DialogDescription>
          </DialogHeader>

            {extracted && (
              <div className="space-y-4">
                  <DateFields start={extracted.event_date} end={extracted.event_date_end} mode={dateMode} onModeChange={setDateMode} onChange={updateField} />

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

              <p className="text-xs text-muted-foreground">已选择 {pendingImages.length} 张图片；关闭编辑可继续调整图片。</p>

              <TagEditor tags={extracted.tags} onChange={(tags) => updateField("tags", tags)} disabled={saving || processingImages} />

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

          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              disabled={saving}
              onClick={() => {
                setShowEditor(false);
                setDateMode("single");

              }}
            >
              取消
            </Button>
            {extracted && (
              <Button size="sm" onClick={handleSave} disabled={saving || processingImages}>
                {saving ? "保存中..." : "确认保存"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
