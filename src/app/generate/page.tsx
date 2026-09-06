"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { Clock3, Copy, History, Loader2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/api-client";
import { useAuth } from "@/components/auth/auth-provider";
import type { GeneratedHistory, GenerateType } from "@/lib/types";
import { getSupabase } from "@/lib/supabase";
import {
  createGeneratedHistory,
  deleteGeneratedHistory,
  fetchGeneratedHistories,
  getGeneratedHistory,
  HISTORY_PAGE_SIZE,
} from "@/lib/generated-history";

const TYPE_LABELS: Record<GenerateType, string> = {
  resume: "简历",
  intro: "自我介绍",
  custom: "自定义",
};

function emptyResults() {
  return {
    resume: "",
    intro: "",
    custom: "",
  };
}

function emptyInputs(): Record<GenerateType, Record<string, unknown>> {
  return {
    resume: {},
    intro: {},
    custom: {},
  };
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function GeneratePage() {
  const { user } = useAuth();
  const [hasMemories, setHasMemories] = useState(false);
  const [loadingMemories, setLoadingMemories] = useState(true);
  const [historyError, setHistoryError] = useState(false);
  const [historyRevision, setHistoryRevision] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeType, setActiveType] = useState<GenerateType>("resume");
  const [results, setResults] = useState<Record<GenerateType, string>>(emptyResults);
  const [resultInputs, setResultInputs] = useState<Record<GenerateType, Record<string, unknown>>>(emptyInputs);
  const [history, setHistory] = useState<GeneratedHistory[]>([]);
  const [unsaved, setUnsaved] = useState<Parameters<typeof createGeneratedHistory>[0] | null>(null);
  const [savingHistory, setSavingHistory] = useState(false);
  const generationRequest = useRef<AbortController | null>(null);
  useEffect(() => () => generationRequest.current?.abort(), []);
  const historyRequest = useRef<AbortController | null>(null);
  const selectionRequest = useRef(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);

  const [resumePosition, setResumePosition] = useState("");
  const [resumeJd, setResumeJd] = useState("");
  const [introScene, setIntroScene] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");

  const activeResult = results[activeType];
  const activeHistory = history.filter((item) => item.type === activeType);

  useEffect(() => {
    const controller = new AbortController();
    Promise.resolve(getSupabase().from("memories").select("id").limit(1).abortSignal(controller.signal))
      .then(({ data, error }) => { if (error) throw error; setHasMemories(Boolean(data?.length)); })
      .catch(() => toast.error("记忆读取失败，请刷新后重试"))
      .finally(() => { if (!controller.signal.aborted) setLoadingMemories(false); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    historyRequest.current = controller;
    fetchGeneratedHistories(activeType, 0, controller.signal)
      .then(items => { if (controller.signal.aborted) return; setHistoryError(false); setHistory(items); setHasMoreHistory(items.length === HISTORY_PAGE_SIZE); })
      .catch(() => { if (!controller.signal.aborted) { setHistoryError(true); toast.error("生成历史读取失败"); } })
      .finally(() => { if (!controller.signal.aborted) setLoadingHistory(false); });
    return () => controller.abort();
  }, [activeType, historyRevision]);

  function getHistoryDraft(type: GenerateType, content: string, historyTitle: string) {
    if (type === "resume") {
      return {
        type,
        title: historyTitle || resumePosition.trim() || "通用简历",
        prompt_summary: resumeJd.trim() ? `JD ${resumeJd.trim().slice(0, 32)}` : "未填写 JD",
        content,
        inputs: { position: resumePosition, jd: resumeJd },
      };
    }

    if (type === "intro") {
      return {
        type,
        title: historyTitle || introScene.trim() || "面试自我介绍",
        prompt_summary: "按场景生成",
        content,
        inputs: { scene: introScene },
      };
    }

    return {
      type,
      title: historyTitle || customPrompt.trim().slice(0, 24) || "自定义生成",
      prompt_summary: customPrompt.trim().slice(0, 48) || "未填写需求",
      content,
      inputs: { prompt: customPrompt },
    };
  }

  async function handleGenerate(type: GenerateType) {
    if (generating || unsaved) {
      if (unsaved) toast.warning("请先保存上一份生成结果，避免丢失");
      return;
    }
    if (!user) {
      toast.error("请先登录");
      return;
    }
    if (!hasMemories) {
      toast.error("还没有记录，先去记一些经历吧");
      return;
    }
    const controller = new AbortController();
    generationRequest.current = controller;
    setGenerating(true);


    const payload =
      type === "resume"
        ? { type, position: resumePosition, jd: resumeJd }
        : type === "intro"
          ? { type, scene: introScene }
          : { type, position: customPrompt };

    try {
      const res = await fetchWithAuth("/api/deepseek/generate", {
        method: "POST",
        signal: controller.signal,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (controller.signal.aborted) return;
      if (data.error) {
        toast.error(data.error);
        return;
      }

      const content = data.content as string;
      if (data.selectedCount < data.candidateCount || data.candidateCount >= 200) toast.info(`本次从最近的经历中选取 ${data.selectedCount} 条生成，可补充明确关键词提高匹配度。`);
      const historyTitle = typeof data.historyTitle === "string" ? data.historyTitle : "";
      const draft = getHistoryDraft(type, content, historyTitle);
      setResults((current) => ({ ...current, [type]: content }));
      setResultInputs((current) => ({ ...current, [type]: draft.inputs }));
      const pending = { id: crypto.randomUUID(), user_id: user.id, ...draft };
      setUnsaved(pending);
      try {
        const item = await createGeneratedHistory(pending);
        setHistory((current) => [item, ...current]);
        setUnsaved(null);
        toast.success(`已保存到${TYPE_LABELS[type]}历史`);
      } catch {
        toast.warning("内容已生成，但历史保存失败。请复制内容或重试保存。");
      }
    } catch (error) {
      if (!controller.signal.aborted) toast.error(error instanceof Error ? error.message : "生成失败，请稍后重试");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSelectHistory(item: GeneratedHistory) {
    const selection = ++selectionRequest.current;
    try {
      const full = item.content ? item : await getGeneratedHistory(item.id);
      if (selection !== selectionRequest.current) return;
      setResults((current) => ({ ...current, [full.type]: full.content }));
      setResultInputs((current) => ({ ...current, [full.type]: full.inputs }));
    } catch { toast.error("历史正文读取失败，请重试"); }
  }

  async function loadMoreHistory() {
    if (loadingHistory) return;
    setLoadingHistory(true);
    try {
      const controller = historyRequest.current;
      const items = await fetchGeneratedHistories(activeType, activeHistory.length, controller?.signal);
      if (controller?.signal.aborted) return;
      setHistory(current => [...current, ...items.filter(item => !current.some(existing => existing.id === item.id))]);
      setHasMoreHistory(items.length === HISTORY_PAGE_SIZE);
    } catch { toast.error("历史读取失败，请重试"); }
    finally { setLoadingHistory(false); }
  }

  async function handleDeleteHistory(id: string) {
    try {
      await deleteGeneratedHistory(id);
      setHistory((current) => current.filter((item) => item.id !== id));
      toast.success("历史已删除");
    } catch {
      toast.error("删除失败，请稍后重试");
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(activeResult);
      toast.success("已复制到剪贴板");
    } catch { toast.error("复制失败，请手动选择并复制内容"); }
  }

  async function retryHistory() {
    if (!unsaved || savingHistory) return;
    setSavingHistory(true);
    try {
      const item = await createGeneratedHistory(unsaved);
      setHistory(current => [item, ...current]);
      setUnsaved(null);
      toast.success("历史已保存");
    } catch { toast.error("历史保存失败，请稍后重试"); }
    finally { setSavingHistory(false); }
  }

  const activePrompt =
    activeType === "resume"
      ? [String(resultInputs.resume.position ?? ""), String(resultInputs.resume.jd ?? "")].filter(Boolean).join("\n\n")
      : activeType === "intro"
        ? String(resultInputs.intro.scene ?? "")
        : String(resultInputs.custom.prompt ?? "");

  const historyContent = historyError ? (<div role="alert" className="text-sm">历史读取失败。<Button variant="outline" onClick={() => setHistoryRevision(value => value + 1)}>重试</Button></div>) : loadingHistory ? (
    <div className="rounded-md border border-dashed p-4 text-xs text-muted-foreground">正在读取历史...</div>
  ) : activeHistory.length === 0 ? (
    <div className="rounded-md border border-dashed p-4 text-xs text-muted-foreground">
      这个模块还没有历史。下一次生成后会自动保存到这里。
    </div>
  ) : (
    <div className="space-y-2">
      {activeHistory.map((item) => (
        <div key={item.id} className="rounded-md border bg-card p-3 hover:border-stone-400 transition-colors">
          <div
            role="button"
            tabIndex={0}
            className="w-full text-left space-y-1 cursor-pointer"
            onClick={() => handleSelectHistory(item)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleSelectHistory(item);
              }
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium leading-snug line-clamp-2">{item.title}</p>
              <span className="shrink-0 inline-flex items-center text-[11px] text-muted-foreground">
                <Clock3 className="h-3 w-3 mr-1" />
                {formatTime(item.created_at)}
              </span>
            </div>
          </div>
          <div className="mt-2 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={() => handleDeleteHistory(item.id)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              删除
            </Button>
          </div>
        </div>
      ))}
      {hasMoreHistory && <Button variant="outline" disabled={loadingHistory} onClick={loadMoreHistory}>加载更多历史</Button>}
    </div>
  );

  if (loadingMemories) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin h-6 w-6 border-2 border-stone-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {unsaved && <div role="alert" className="mb-4 rounded-md border p-3 text-sm">有生成内容尚未保存。<Button variant="outline" onClick={retryHistory} disabled={savingHistory}>重试保存历史</Button></div>}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          <Tabs
            value={activeType}
            onValueChange={(value) => { if (value === activeType) return; setLoadingHistory(true); setHasMoreHistory(false); setActiveType(value as GenerateType); }}
            className="space-y-6"
          >
            <TabsList className="w-full justify-start bg-transparent border-b rounded-none p-0 h-auto gap-4">
              <TabsTrigger
                value="resume"
                className="data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none px-1 pb-1.5 pt-0 shadow-none bg-transparent text-sm"
              >
                简历
              </TabsTrigger>
              <TabsTrigger
                value="intro"
                className="data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none px-1 pb-1.5 pt-0 shadow-none bg-transparent text-sm"
              >
                自我介绍
              </TabsTrigger>
              <TabsTrigger
                value="custom"
                className="data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none px-1 pb-1.5 pt-0 shadow-none bg-transparent text-sm"
              >
                自定义
              </TabsTrigger>
            </TabsList>

            <TabsContent value="resume" className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">目标岗位（选填）</Label>
                  <Input
                    placeholder="如：数据分析实习生"
                    value={resumePosition}
                    onChange={(e) => setResumePosition(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">粘贴 JD（选填）</Label>
                  <Textarea
                    placeholder="粘贴岗位描述，AI 会更精准地匹配经历..."
                    value={resumeJd}
                    onChange={(e) => setResumeJd(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>
              <Button onClick={() => handleGenerate("resume")} disabled={generating}>
                {generating ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-1.5" />
                )}
                生成简历
              </Button>
            </TabsContent>

            <TabsContent value="intro" className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm">场景</Label>
                <Input
                  placeholder="如：课堂自我介绍 / 面试开场 / 社团竞选"
                  value={introScene}
                  onChange={(e) => setIntroScene(e.target.value)}
                  className="h-9"
                />
              </div>
              <Button onClick={() => handleGenerate("intro")} disabled={generating}>
                {generating ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-1.5" />
                )}
                生成自我介绍
              </Button>
            </TabsContent>

            <TabsContent value="custom" className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm">描述你的需求</Label>
                <Textarea
                  placeholder="如：我有哪些社会工作经历？/ 帮我整理项目管理相关的经验"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>
              <Button onClick={() => handleGenerate("custom")} disabled={generating}>
                {generating ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-1.5" />
                )}
                生成
              </Button>
            </TabsContent>
          </Tabs>

          {activeResult && (
            <Card className="mt-6">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">{TYPE_LABELS[activeType]}结果</CardTitle>
                </div>
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  复制
                </Button>
              </CardHeader>
              <CardContent>
                <MarkdownContent content={activeResult} />
                {activePrompt && (
                  <details className="mt-5 border-t pt-3 text-sm">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">本次需求</summary>
                    <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{activePrompt}</p>
                  </details>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <details className="rounded-md border bg-card p-3 lg:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium">
            <span className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              {TYPE_LABELS[activeType]}历史
            </span>
            <Badge variant="secondary" className="text-xs">{activeHistory.length}</Badge>
          </summary>
          <div className="mt-3">{historyContent}</div>
        </details>

        <aside className="hidden space-y-3 lg:block">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-medium">{TYPE_LABELS[activeType]}历史</h2>
            </div>
            <Badge variant="secondary" className="text-xs">
              {activeHistory.length}
            </Badge>
          </div>
          {historyContent}
        </aside>
      </div>
    </div>
  );
}
