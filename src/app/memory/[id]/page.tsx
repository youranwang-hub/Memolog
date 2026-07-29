"use client";

import { useState, useEffect, use } from "react";
import Image from "next/image";
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
import { ArrowLeft, Trash2, Save, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import type { Memory, Category, Emotion } from "@/lib/types";
import { EMOTIONS, EMOTION_MAP } from "@/lib/types";
import { getMemory, updateMemory, deleteMemory } from "@/lib/memories";
import { normalizeEventDate, formatEventDateRange } from "@/lib/dates";
import { DatePicker } from "@/components/ui/date-picker";
import { useAuth } from "@/components/auth/auth-provider";
import { fetchProfile } from "@/lib/profile";
import { getCategories } from "@/lib/types";
import type { MemoryAttachment } from "@/lib/types";
import { MemoryImagePicker, type PendingMemoryImage } from "@/components/memory/memory-image-picker";
import {
  createMemoryImageUrl,
  deleteMemoryAttachments,
  fetchMemoryAttachments,
  uploadMemoryAttachments,
} from "@/lib/memory-attachments";

type DateMode = "single" | "range";
type AttachmentPreview = MemoryAttachment & { url: string };
const MAX_TAGS = 8;
const MAX_TAG_LENGTH = 16;

function normalizeTags(tags: string[]) {
  return Array.from(
    new Set(tags.map((tag) => tag.trim().replace(/\s+/g, " ")).filter(Boolean))
  ).slice(0, MAX_TAGS);
}

export default function MemoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const [memory, setMemory] = useState<Memory | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [dateMode, setDateMode] = useState<DateMode>("single");
  const [categories, setCategories] = useState<string[]>(getCategories());
  const [tagInput, setTagInput] = useState("");
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);
  const [pendingImages, setPendingImages] = useState<PendingMemoryImage[]>([]);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>([]);

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
          tags: normalizeTags(data.tags ?? []),
          raw_input: data.raw_input,
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchMemoryAttachments(id)
      .then(async (items) => {
        const previews = await Promise.all(
          items.map(async (item) => ({ ...item, url: await createMemoryImageUrl(item.storage_path) }))
        );
        setAttachments(previews);
      })
      .catch(() => setAttachments([]));
  }, [id]);

  useEffect(() => {
    if (!user) return;
    fetchProfile(user.id)
      .then((profile) => setCategories(getCategories(profile?.custom_categories)))
      .catch(() => undefined);
  }, [user]);

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
      const attachmentsToDelete = attachments.filter((attachment) =>
        removedAttachmentIds.includes(attachment.id)
      );
      const remainingAttachments = attachments.filter(
        (attachment) => !removedAttachmentIds.includes(attachment.id)
      );

      if (attachmentsToDelete.length > 0) {
        await deleteMemoryAttachments(attachmentsToDelete);
      }

      const uploadedAttachments =
        pendingImages.length > 0 && user
          ? await uploadMemoryAttachments({
              memoryId: id,
              userId: user.id,
              files: pendingImages.map((image) => image.file),
              startOrder: remainingAttachments.length,
            })
          : [];
      const uploadedPreviews = await Promise.all(
        uploadedAttachments.map(async (attachment) => ({
          ...attachment,
          url: await createMemoryImageUrl(attachment.storage_path),
        }))
      );

      setMemory(updated);
      setAttachments([...remainingAttachments, ...uploadedPreviews]);
      setPendingImages([]);
      setRemovedAttachmentIds([]);
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
      await deleteMemoryAttachments(attachments);
      await deleteMemory(id);
      toast.success("已删除");
      router.push("/dashboard");
    } catch {
      toast.error("删除失败");
    }
  }

  function addTags(rawValue = tagInput) {
    const candidates = rawValue
      .split(/[,，\n]/)
      .map((tag) => tag.slice(0, MAX_TAG_LENGTH));
    const nextTags = normalizeTags([...form.tags, ...candidates]);

    if (nextTags.length === form.tags.length && candidates.some((tag) => tag.trim())) {
      toast.error(`每条记忆最多 ${MAX_TAGS} 个标签`);
    }

    setForm({ ...form, tags: nextTags });
    setTagInput("");
  }

  function removeTag(tag: string) {
    setForm({ ...form, tags: form.tags.filter((item) => item !== tag) });
  }

  function startEditing() {
    setPendingImages([]);
    setRemovedAttachmentIds([]);
    setEditing(true);
  }

  function cancelEditing() {
    setPendingImages([]);
    setRemovedAttachmentIds([]);
    setEditing(false);
  }

  function markAttachmentForRemoval(id: string) {
    setRemovedAttachmentIds((current) => [...current, id]);
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
            <Button variant="ghost" size="sm" onClick={startEditing}>
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

            {attachments.length > 0 && (
              <div className="space-y-2 pt-4 border-t">
                <Label className="text-xs text-muted-foreground">相关图片</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {attachments.map((attachment) => (
                    <a
                      key={attachment.id}
                      href={attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      className="relative block aspect-[4/3] overflow-hidden rounded-md border bg-muted"
                    >
                      <Image
                        src={attachment.url}
                        alt="相关记忆图片"
                        fill
                        unoptimized
                        className="h-full w-full object-cover transition-transform hover:scale-[1.02]"
                      />
                    </a>
                  ))}
                </div>
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
                    {getCategories([...categories, form.category]).map((c) => (
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

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-xs">相关图片</Label>
                <span className="text-[11px] text-muted-foreground">
                  {attachments.length - removedAttachmentIds.length + pendingImages.length}/6
                </span>
              </div>
              {attachments.some((attachment) => !removedAttachmentIds.includes(attachment.id)) && (
                <div className="flex flex-wrap gap-2">
                  {attachments
                    .filter((attachment) => !removedAttachmentIds.includes(attachment.id))
                    .map((attachment) => (
                      <div key={attachment.id} className="group relative h-16 w-16 overflow-hidden rounded-md border bg-muted">
                        <Image
                          src={attachment.url}
                          alt="已保存的相关图片"
                          width={64}
                          height={64}
                          unoptimized
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => markAttachmentForRemoval(attachment.id)}
                          className="absolute right-1 top-1 rounded-sm bg-background/90 p-0.5 text-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus:opacity-100"
                          aria-label="删除图片"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                </div>
              )}
              <MemoryImagePicker
                images={pendingImages}
                onChange={setPendingImages}
                disabled={saving || attachments.length - removedAttachmentIds.length + pendingImages.length >= 6}
                compact
                maxImages={6 - (attachments.length - removedAttachmentIds.length)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-xs">标签</Label>
                <span className="text-[11px] text-muted-foreground">
                  {form.tags.length}/{MAX_TAGS}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {form.tags.map((tag) => (
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
                {form.tags.length === 0 && (
                  <span className="text-xs text-muted-foreground">还没有标签</span>
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
                  placeholder="输入标签，可用逗号分隔"
                  maxLength={MAX_TAG_LENGTH * 2 + 1}
                  className="h-9"
                  disabled={form.tags.length >= MAX_TAGS}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addTags()}
                  disabled={!tagInput.trim() || form.tags.length >= MAX_TAGS}
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
              <Button variant="ghost" size="sm" onClick={cancelEditing}>
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
