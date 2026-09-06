"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MAX_TAGS, MAX_TAG_LENGTH, normalizeTags } from "@/lib/memory-validation";
export function TagEditor({ tags, onChange, disabled = false }: { tags: string[]; onChange: (tags: string[]) => void; disabled?: boolean }) {
  const [input, setInput] = useState("");
  function add() {
    onChange(normalizeTags([...tags, ...input.split(/[,，\n]/)]));
    setInput("");
  }
  return <div className="space-y-2">
    <div className="flex justify-between text-xs"><span>标签</span><span>{tags.length}/{MAX_TAGS}</span></div>
    <div className="flex flex-wrap gap-1.5">{tags.map(tag => <Badge key={tag} variant="secondary">{tag}<button type="button" disabled={disabled} aria-label={`删除标签 ${tag}`} onClick={() => onChange(tags.filter(value => value !== tag))}><X className="h-3 w-3" /></button></Badge>)}</div>
    <div className="flex gap-2"><Input value={input} onChange={event => setInput(event.target.value)} placeholder="输入标签，可用逗号分隔" maxLength={MAX_TAG_LENGTH * 2 + 1} disabled={disabled || tags.length >= MAX_TAGS} onKeyDown={event => { if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); add(); } }} />
    <Button type="button" variant="outline" disabled={disabled || !input.trim() || tags.length >= MAX_TAGS} onClick={add}>添加</Button></div>
  </div>;
}
