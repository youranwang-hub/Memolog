"use client";
import { TagEditor } from "@/components/memory/tag-editor";
import { normalizeTags, validateMemory } from "@/lib/memory-validation";


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
import { DateFields } from "@/components/memory/date-fields";
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
  MAX_MEMORY_IMAGES,
} from "@/lib/memory-attachments";

type DateMode = "single" | "range";
type AttachmentPreview = MemoryAttachment & { url: string };

export default function MemoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const [memory, setMemory] = useState<Memory | null>(null);
  const [loadError, setLoadError] = useState("");
  const [attachmentsError, setAttachmentsError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [dateMode, setDateMode] = useState<DateMode>("single");
  const [categories, setCategories] = useState<string[]>(getCategories());
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);
  const [selectedAttachment, setSelectedAttachment] = useState<AttachmentPreview | null>(null);
  const [processingImages, setProcessingImages] = useState(false);
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
      .catch(() => setLoadError("记忆读取失败，请刷新重试"))
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
      .catch(() => setAttachmentsError(true));
  }, [id]);

  useEffect(() => {
    if (!user) return;
    fetchProfile(user.id)
      .then((profile) => setCategories(getCategories(profile?.custom_categories)))
      .catch(() => undefined);
  }, [user]);

  async function handleSave() {
    if (saving || processingImages || attachmentsError) return;
    setSaving(true);
    let textSaved = false;
    try {
      const updated = await updateMemory(id, {
        ...validateMemory({ ...form, event_date_end: dateMode === "range" ? form.event_date_end : null }),
        raw_input: form.raw_input,
        event_date: normalizeEventDate(form.event_date),
        event_date_end:
          dateMode === "range" && form.event_date_end
            ? normalizeEventDate(form.event_date_end)
            : null,
      });
      setMemory(updated);
      textSaved = true;
      const attachmentsToDelete = attachments.filter((attachment) =>
        removedAttachmentIds.includes(attachment.id)
      );
      const remainingAttachments = attachments.filter(
        (attachment) => !removedAttachmentIds.includes(attachment.id)
      );

      if (attachmentsToDelete.length > 0) {
        await deleteMemoryAttachments(attachmentsToDelete);
        setAttachments(remainingAttachments);
        setRemovedAttachmentIds([]);
      }

      const uploadedAttachments =
        pendingImages.length > 0 && user
          ? await uploadMemoryAttachments({
              memoryId: id,
              userId: user.id,
              files: pendingImages.map((image) => image.file),
              startOrder: Math.max(-1, ...remainingAttachments.map(item => item.sort_order)) + 1,
            })
          : [];
      setPendingImages([]);
      const uploadedPreviews = await Promise.all(
        uploadedAttachments.map(async (attachment) => ({
          ...attachment,
          url: await createMemoryImageUrl(attachment.storage_path).catch(() => { setAttachmentsError(true); return ""; }),
        }))
      );

      setMemory(updated);
      setAttachments([...remainingAttachments, ...uploadedPreviews]);
      setPendingImages([]);
      setRemovedAttachmentIds([]);
      setEditing(false);
      toast.success("已更新");
    } catch (error) {
      toast.error(textSaved ? "正文已保存，图片更新未完成。请重试保存图片。" : error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (saving || processingImages || attachmentsError) return;
    setSaving(true);
    try {
      await deleteMemoryAttachments(attachments);
      await deleteMemory(id);
      toast.success("已删除");
      router.push("/dashboard");
    } catch {
      toast.error("删除失败，请重试");
    } finally { setSaving(false); }
  }


  function startEditing() {
    setPendingImages([]);
    setRemovedAttachmentIds([]);
    setEditing(true);
  }

  function cancelEditing() {
    if (saving) return;
    if (memory) {
      setForm({ ...memory, event_date_end: memory.event_date_end ?? "", tags: normalizeTags(memory.tags ?? []) });
      setDateMode(memory.event_date_end ? "range" : "single");
    }
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
        <p className="text-muted-foreground">{loadError || "记录不存在"}</p>
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

      {attachmentsError && <p role="alert" className="text-sm text-destructive">图片读取失败，暂时无法修改或删除记忆。<button onClick={() => window.location.reload()} className="underline ml-2">重新加载</button></p>}
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
                    <button
                      key={attachment.id}
                      type="button"
                      onClick={() => setSelectedAttachment(attachment)}
                      aria-label={`查看图片 ${attachment.sort_order + 1}`}
                      className="relative block aspect-[4/3] overflow-hidden rounded-md border bg-muted"
                    >
                      <Image
                        src={attachment.url || "/file.svg"}
                        alt="相关记忆图片"
                        fill
                        unoptimized
                        className="h-full w-full object-cover transition-transform hover:scale-[1.02]"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4 space-y-4">
              <DateFields start={form.event_date} end={form.event_date_end} mode={dateMode} onModeChange={setDateMode} onChange={(field, value) => setForm({ ...form, [field]: value })} />

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
                  {attachments.length - removedAttachmentIds.length + pendingImages.length}/{MAX_MEMORY_IMAGES}
                </span>
              </div>
              {attachments.some((attachment) => !removedAttachmentIds.includes(attachment.id)) && (
                <div className="flex flex-wrap gap-2">
                  {attachments
                    .filter((attachment) => !removedAttachmentIds.includes(attachment.id))
                    .map((attachment) => (
                      <div key={attachment.id} className="group relative h-16 w-16 overflow-hidden rounded-md border bg-muted">
                        <Image
                          src={attachment.url || "/file.svg"}
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
            onProcessingChange={setProcessingImages}
                disabled={saving || attachments.length - removedAttachmentIds.length + pendingImages.length >= MAX_MEMORY_IMAGES}
                compact
                maxImages={MAX_MEMORY_IMAGES - (attachments.length - removedAttachmentIds.length)}
              />
            </div>

            <TagEditor tags={form.tags} onChange={(tags) => setForm({ ...form, tags })} disabled={saving || processingImages} />

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
              <Button size="sm" onClick={handleSave} disabled={saving || processingImages || attachmentsError}>
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                保存
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={Boolean(selectedAttachment)} onOpenChange={(open) => !open && setSelectedAttachment(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden p-2 sm:max-w-4xl">
          <DialogHeader className="sr-only">
            <DialogTitle>相关图片预览</DialogTitle>
          </DialogHeader>
          {selectedAttachment && (
            <Image
              src={selectedAttachment.url}
              alt="相关记忆图片预览"
              width={1600}
              height={1200}
              unoptimized
              className="h-auto max-h-[80vh] w-auto max-w-full object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

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
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={saving || processingImages || attachmentsError}>
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
