"use client";

import { useEffect, useState } from "react";
import { Globe2, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/api-client";
import type { Memory, PersonalSiteMemory } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Draft = Omit<PersonalSiteMemory, "memory_id" | "user_id" | "updated_at" | "published_at">;

function fromMemory(memory: Memory): Draft {
  return { is_public: false, title: memory.title, summary: memory.result || memory.content.slice(0, 120), body: memory.content, category: memory.category, tags: memory.tags, event_date: memory.event_date, event_date_end: memory.event_date_end ?? null, cover_image_url: null, publish_cover_image: false };
}

export function PersonalSitePublisher({ memory }: { memory: Memory }) {
  const [available, setAvailable] = useState(false);
  const [checked, setChecked] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => fromMemory(memory));
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    let active = true;
    fetchWithAuth(`/api/personal-site/memories/${memory.id}`)
      .then(async (response) => {
        if (!response.ok) return;
        const { publication } = await response.json();
        if (!active) return;
        setAvailable(true);
        if (publication) setDraft(publication);
      })
      .catch(() => undefined)
      .finally(() => { if (active) setChecked(true); });
    return () => { active = false; };
  }, [memory.id]);

  async function generate() {
    setGenerating(true);
    try {
      const response = await fetchWithAuth("/api/personal-site/generate", { method: "POST", body: JSON.stringify({ memoryId: memory.id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setDraft(data.draft);
      toast.success("已生成可编辑的网站版本");
    } catch (error) { toast.error(error instanceof Error ? error.message : "生成失败"); }
    finally { setGenerating(false); }
  }

  async function save() {
    setSaving(true);
    try {
      const response = await fetchWithAuth(`/api/personal-site/memories/${memory.id}`, { method: "PUT", body: JSON.stringify(draft) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setDraft(data.publication);
      const synced = await sync();
      if (synced) toast.success(draft.is_public ? "已发布并同步到个人网站" : "已取消公开并从个人网站移除");
      else toast.warning("发布设置已保存，但尚未同步到个人网站");
    } catch (error) { toast.error(error instanceof Error ? error.message : "保存失败"); }
    finally { setSaving(false); }
  }

  async function sync() {
    setSyncing(true);
    try {
      const response = await fetchWithAuth("/api/personal-site/sync", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success(`已同步 ${data.count} 条公开记忆，GitHub Pages 将自动更新`);
      return true;
    } catch (error) { toast.error(error instanceof Error ? error.message : "同步失败"); }
    finally { setSyncing(false); }
    return false;
  }

  if (!checked || !available) return null;
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  return <>
    <Button variant="outline" size="sm" onClick={() => setOpen(true)}><Globe2 className="mr-1 h-4 w-4" />个人网站</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>发布到个人网站</DialogTitle><DialogDescription>原始记忆保持私有。这里是独立的网站版本，确认发布并同步后才会公开。</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2"><p className="text-sm">由 DeepSeek 起草，再由你决定是否发布。</p><Button type="button" variant="outline" size="sm" onClick={generate} disabled={generating}>{generating ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}生成网站版本</Button></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.is_public} onChange={(event) => update("is_public", event.target.checked)} />公开到我的个人网站</label>
          <div className="space-y-1"><Label>标题</Label><Input value={draft.title} maxLength={120} onChange={(event) => update("title", event.target.value)} /></div>
          <div className="space-y-1"><Label>摘要</Label><Textarea value={draft.summary} maxLength={360} rows={3} onChange={(event) => update("summary", event.target.value)} /></div>
          <div className="space-y-1"><Label>正文</Label><Textarea value={draft.body} maxLength={12000} rows={12} onChange={(event) => update("body", event.target.value)} /></div>
          <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1"><Label>分类</Label><Input value={draft.category} maxLength={40} onChange={(event) => update("category", event.target.value)} /></div><div className="space-y-1"><Label>标签（用逗号分隔）</Label><Input value={draft.tags.join(", ")} onChange={(event) => update("tags", event.target.value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean))} /></div></div>
          <div className="space-y-1"><Label>封面图地址（可选）</Label><Input value={draft.cover_image_url ?? ""} placeholder="默认不会发布图片" onChange={(event) => update("cover_image_url", event.target.value || null)} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.publish_cover_image} disabled={!draft.cover_image_url} onChange={(event) => update("publish_cover_image", event.target.checked)} />发布这张封面图</label>
        </div>
        <DialogFooter><Button variant="outline" onClick={sync} disabled={syncing}>{syncing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}立即同步公开记忆</Button><Button onClick={save} disabled={saving}>{saving ? "保存中…" : "保存发布设置"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
