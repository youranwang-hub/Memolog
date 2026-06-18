"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock3, Copy, History, Loader2, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getAuthHeaders } from "@/lib/api-client";
import { useAuth } from "@/components/auth/auth-provider";
import type { Memory } from "@/lib/types";
import { fetchMemories } from "@/lib/memories";

type GenerateType = "resume" | "intro" | "custom";

interface GeneratedHistoryItem {
  id: string;
  type: GenerateType;
  title: string;
  promptSummary: string;
  content: string;
  createdAt: string;
}

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

function makeHistoryKey(userId?: string) {
  return `memolog:generation-history:${userId ?? "anonymous"}:v1`;
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
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loadingMemories, setLoadingMemories] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeType, setActiveType] = useState<GenerateType>("resume");
  const [results, setResults] = useState<Record<GenerateType, string>>(emptyResults);
  const [history, setHistory] = useState<GeneratedHistoryItem[]>([]);

  const [resumePosition, setResumePosition] = useState("");
  const [resumeJd, setResumeJd] = useState("");
  const [introScene, setIntroScene] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");

  const historyKey = useMemo(() => makeHistoryKey(user?.id), [user?.id]);
  const activeResult = results[activeType];
  const activeHistory = history.filter((item) => item.type === activeType);

  useEffect(() => {
    fetchMemories()
      .then(setMemories)
      .finally(() => setLoadingMemories(false));
  }, []);

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      await Promise.resolve();
      try {
        const stored = window.localStorage.getItem(historyKey);
        if (active) setHistory(stored ? JSON.parse(stored) : []);
      } catch {
        if (active) setHistory([]);
      }
    }

    void loadHistory();

    return () => {
      active = false;
    };
  }, [historyKey]);

  function saveHistory(nextHistory: GeneratedHistoryItem[]) {
    setHistory(nextHistory);
    window.localStorage.setItem(historyKey, JSON.stringify(nextHistory));
  }

  function createHistoryItem(type: GenerateType, content: string): GeneratedHistoryItem {
    const createdAt = new Date().toISOString();

    if (type === "resume") {
      return {
        id: crypto.randomUUID(),
        type,
        title: resumePosition.trim() || "通用简历",
        promptSummary: resumeJd.trim() ? `JD ${resumeJd.trim().slice(0, 32)}` : "未填写 JD",
        content,
        createdAt,
      };
    }

    if (type === "intro") {
      return {
        id: crypto.randomUUID(),
        type,
        title: introScene.trim() || "面试自我介绍",
        promptSummary: "按场景生成",
        content,
        createdAt,
      };
    }

    return {
      id: crypto.randomUUID(),
      type,
      title: customPrompt.trim().slice(0, 24) || "自定义生成",
      promptSummary: customPrompt.trim().slice(0, 48) || "未填写需求",
      content,
      createdAt,
    };
  }

  async function handleGenerate(type: GenerateType) {
    if (memories.length === 0) {
      toast.error("还没有记录，先去记一些经历吧");
      return;
    }
    setGenerating(true);
    setResults((current) => ({ ...current, [type]: "" }));

    const payload =
      type === "resume"
        ? { type, position: resumePosition, jd: resumeJd }
        : type === "intro"
          ? { type, scene: introScene }
          : { type, position: customPrompt };

    try {
      const res = await fetch("/api/claude/generate", {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        return;
      }

      const content = data.content as string;
      const item = createHistoryItem(type, content);
      const nextHistory = [item, ...history.filter((oldItem) => oldItem.id !== item.id)].slice(0, 90);

      setResults((current) => ({ ...current, [type]: content }));
      saveHistory(nextHistory);
      toast.success(`已保存到${TYPE_LABELS[type]}历史`);
    } catch {
      toast.error("生成失败，请稍后重试");
    } finally {
      setGenerating(false);
    }
  }

  function handleSelectHistory(item: GeneratedHistoryItem) {
    setActiveType(item.type);
    setResults((current) => ({ ...current, [item.type]: item.content }));
  }

  function handleDeleteHistory(id: string) {
    const nextHistory = history.filter((item) => item.id !== id);
    saveHistory(nextHistory);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(activeResult);
    toast.success("已复制到剪贴板");
  }

  if (loadingMemories) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin h-6 w-6 border-2 border-stone-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          <Tabs
            value={activeType}
            onValueChange={(value) => setActiveType(value as GenerateType)}
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
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed">
                  {activeResult}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <aside className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-medium">{TYPE_LABELS[activeType]}历史</h2>
            </div>
            <Badge variant="secondary" className="text-xs">
              {activeHistory.length}
            </Badge>
          </div>

          {activeHistory.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-xs text-muted-foreground">
              这个模块还没有历史。下一次生成后会自动保存到这里。
            </div>
          ) : (
            <div className="space-y-2">
              {activeHistory.map((item) => (
                <div
                  key={item.id}
                  className="rounded-md border bg-card p-3 hover:border-stone-400 transition-colors"
                >
                  <button
                    type="button"
                    className="w-full text-left space-y-1"
                    onClick={() => handleSelectHistory(item)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-snug line-clamp-2">{item.title}</p>
                      <span className="shrink-0 inline-flex items-center text-[11px] text-muted-foreground">
                        <Clock3 className="h-3 w-3 mr-1" />
                        {formatTime(item.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.promptSummary}</p>
                  </button>
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
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
