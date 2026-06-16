"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Memory } from "@/lib/types";
import { fetchMemories } from "@/lib/memories";

export default function GeneratePage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loadingMemories, setLoadingMemories] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState("");

  const [position, setPosition] = useState("");
  const [jd, setJd] = useState("");
  const [scene, setScene] = useState("");

  useEffect(() => {
    fetchMemories()
      .then(setMemories)
      .finally(() => setLoadingMemories(false));
  }, []);

  async function handleGenerate(type: string) {
    if (memories.length === 0) {
      toast.error("还没有记录，先去记一些经历吧");
      return;
    }
    setGenerating(true);
    setResult("");

    try {
      const res = await fetch("/api/claude/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memories, type, position, jd, scene }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        setResult(data.content);
      }
    } catch {
      toast.error("生成失败，请稍后重试");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(result);
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
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Tabs defaultValue="resume" className="space-y-6">
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
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">粘贴 JD（选填）</Label>
              <Textarea
                placeholder="粘贴岗位描述，AI 会更精准地匹配经历..."
                value={jd}
                onChange={(e) => setJd(e.target.value)}
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
              value={scene}
              onChange={(e) => setScene(e.target.value)}
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
              value={position}
              onChange={(e) => setPosition(e.target.value)}
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

      {result && (
        <Card className="mt-6">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">生成结果</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={handleCopy}>
              <Copy className="h-3.5 w-3.5 mr-1" />
              复制
            </Button>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed">
              {result}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
