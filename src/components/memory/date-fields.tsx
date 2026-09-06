"use client";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { formatEventDateRange } from "@/lib/dates";
export function DateFields({ start, end, mode, onModeChange, onChange }: {
  start: string; end?: string | null; mode: "single" | "range";
  onModeChange: (mode: "single" | "range") => void;
  onChange: (field: "event_date" | "event_date_end", value: string) => void;
}) {
  return <div className="space-y-2"><span className="text-xs">日期</span>
    <div className="flex gap-1.5">{(["single", "range"] as const).map(value => <Button key={value} type="button" size="sm" variant={mode === value ? "default" : "outline"} onClick={() => onModeChange(value)}>{value === "single" ? "单日" : "阶段"}</Button>)}</div>
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><DatePicker value={start} onChange={value => onChange("event_date", value)} />{mode === "range" && <DatePicker label="结束日期" value={end ?? ""} minDate={start === "未知" ? undefined : start} onChange={value => onChange("event_date_end", value)} />}</div>
    {mode === "range" && end && <p className="text-xs text-muted-foreground">{formatEventDateRange(start, end)}</p>}
  </div>;
}
