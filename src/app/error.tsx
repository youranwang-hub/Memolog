"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div role="alert" className="max-w-lg mx-auto px-4 py-16 space-y-4"><h1 className="text-lg font-medium">页面暂时无法显示</h1><p className="text-sm text-muted-foreground">请重试加载；已保存的数据不会因本次页面错误而删除。</p><Button onClick={reset}>重新加载</Button></div>;
}
