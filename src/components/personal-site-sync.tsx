"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { fetchWithAuth } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

export function PersonalSiteSync() {
  const [state, setState] = useState<{ configured: boolean; count: number } | null>(null);
  const [syncing, setSyncing] = useState(false);
  useEffect(() => { fetchWithAuth("/api/personal-site/sync").then(async (response) => response.ok ? setState(await response.json()) : null).catch(() => undefined); }, []);
  if (!state) return null;
  async function sync() {
    setSyncing(true);
    try {
      const response = await fetchWithAuth("/api/personal-site/sync", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success(`已同步 ${data.count} 条公开记忆`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "同步失败"); }
    finally { setSyncing(false); }
  }
  return <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">当前有 {state.count} 条记忆会同步到个人网站。{state.configured ? "" : " GitHub 同步尚未配置。"}</p><Button variant="outline" onClick={sync} disabled={syncing || !state.configured}>{syncing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1 h-4 w-4" />}立即同步公开记忆</Button></div>;
}
