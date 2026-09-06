import { NextResponse } from "next/server";
import { requirePersonalSiteOwner } from "@/lib/api-auth";
import { PERSONAL_SITE_DATA_PATH, publicSitePayload } from "@/lib/personal-site";
import type { PersonalSiteMemory } from "@/lib/types";

type GitHubFile = { sha?: string };

export async function GET(request: Request) {
  const auth = await requirePersonalSiteOwner(request);
  if (auth.error) return auth.error;
  const { count, error } = await auth.supabase.from("personal_site_memories").select("*", { count: "exact", head: true }).eq("is_public", true);
  if (error) return NextResponse.json({ error: "读取公开记忆失败" }, { status: 500 });
  return NextResponse.json({ configured: Boolean(process.env.GITHUB_PERSONAL_SITE_TOKEN && process.env.GITHUB_PERSONAL_SITE_REPO), count: count ?? 0 });
}

export async function POST(request: Request) {
  try {
    const auth = await requirePersonalSiteOwner(request);
    if (auth.error) return auth.error;
    const token = process.env.GITHUB_PERSONAL_SITE_TOKEN;
    const repo = process.env.GITHUB_PERSONAL_SITE_REPO;
    const branch = process.env.GITHUB_PERSONAL_SITE_BRANCH || "master";
    if (!token || !repo) return NextResponse.json({ error: "个人网站同步尚未配置" }, { status: 503 });
    const { data, error } = await auth.supabase.from("personal_site_memories").select("*").eq("is_public", true);
    if (error) throw error;
    const api = `https://api.github.com/repos/${repo}/contents/${PERSONAL_SITE_DATA_PATH}`;
    const headers = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
    const existing = await fetch(`${api}?ref=${encodeURIComponent(branch)}`, { headers });
    const existingFile: GitHubFile | null = existing.status === 404 ? null : existing.ok ? await existing.json() : null;
    if (!existingFile && ![200, 404].includes(existing.status)) throw new Error("无法读取个人网站仓库");
    const payload = JSON.stringify(publicSitePayload((data ?? []) as PersonalSiteMemory[]), null, 2) + "\n";
    const result = await fetch(api, { method: "PUT", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ message: "Update public memories from Memolog", content: Buffer.from(payload).toString("base64"), branch, ...(existingFile?.sha ? { sha: existingFile.sha } : {}) }) });
    if (!result.ok) throw new Error("GitHub 未接受同步请求");
    return NextResponse.json({ success: true, count: data?.length ?? 0 });
  } catch (error) {
    console.error("Personal-site sync error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "同步失败，请稍后重试" }, { status: 500 });
  }
}
