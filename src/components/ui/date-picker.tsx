"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CalendarDays, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseEventDay, formatEventDate } from "@/lib/dates";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function toDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return parseEventDay(value);
}

function toValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayValue() {
  return toValue(new Date());
}

function monthFrom(value?: string) {
  const date = parseEventDay(value);
  const now = new Date();
  return new Date(date?.getFullYear() ?? now.getFullYear(), date?.getMonth() ?? now.getMonth(), 1);
}

export function DatePicker({
  value,
  onChange,
  label = "日期",
  maxDate,
  minDate,
}: {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  maxDate?: string;
  minDate?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => monthFrom(value));
  const selectedDate = toDate(value);
  const latest = maxDate ?? todayValue();

  const days = useMemo(() => {
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return Array.from({ length: firstDay.getDay() + daysInMonth }, (_, index) => {
      const day = index - firstDay.getDay() + 1;
      return day > 0 ? new Date(month.getFullYear(), month.getMonth(), day) : null;
    });
  }, [month]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function isUnavailable(date: Date) {
    const dateValue = toValue(date);
    return dateValue > latest || (!!minDate && dateValue < minDate);
  }

  function openCalendar() {
    setMonth(monthFrom(value));
    setOpen(true);
  }

  function selectDate(date: Date) {
    if (isUnavailable(date)) return;
    onChange(toValue(date));
    setOpen(false);
  }

  function monthHasSelectableDay(candidate: Date) {
    const start = new Date(candidate.getFullYear(), candidate.getMonth(), 1);
    const end = new Date(candidate.getFullYear(), candidate.getMonth() + 1, 0);
    return toValue(start) <= latest && (!minDate || toValue(end) >= minDate);
  }

  const monthLabel = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long" }).format(month);
  const monthOnly = value && /^\d{4}-\d{2}$/.test(value);
  const previousMonth = new Date(month.getFullYear(), month.getMonth() - 1, 1);
  const nextMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  const previousYear = new Date(month.getFullYear() - 1, month.getMonth(), 1);
  const nextYear = new Date(month.getFullYear() + 1, month.getMonth(), 1);
  const canGoBack = monthHasSelectableDay(previousMonth);
  const canGoForward = monthHasSelectableDay(nextMonth);
  const canGoPreviousYear = monthHasSelectableDay(previousYear);
  const canGoNextYear = monthHasSelectableDay(nextYear);

  return (
    <div ref={rootRef} className="relative space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={openCalendar}
          className="flex h-8 min-w-0 flex-1 items-center justify-between rounded-md border bg-background px-2.5 text-left text-sm transition-colors hover:border-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <span className={cn("truncate", !selectedDate && "text-muted-foreground")}>
            {selectedDate || monthOnly ? formatEventDate(value) : "选择日期"}
          </span>
          <CalendarDays className="ml-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </button>
        {selectedDate && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => onChange("")}
            aria-label="清除日期"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {open && (
        <div
          role="dialog"
          aria-label="选择日期"
          className="absolute z-50 mt-2 w-[280px] rounded-xl border bg-card p-3 shadow-lg shadow-stone-900/10"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={!canGoPreviousYear}
                onClick={() => setMonth(previousYear)}
                aria-label="上一年"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={!canGoBack}
                onClick={() => setMonth(previousMonth)}
                aria-label="上个月"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
            <span className="text-sm font-medium">{monthLabel}</span>
            <div className="flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={!canGoForward}
                onClick={() => setMonth(nextMonth)}
                aria-label="下个月"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={!canGoNextYear}
                onClick={() => setMonth(nextYear)}
                aria-label="下一年"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((weekday) => (
              <span key={weekday} className="h-7 leading-7 text-[11px] text-muted-foreground">
                {weekday}
              </span>
            ))}
            {days.map((date, index) => {
              if (!date) return <span key={`empty-${index}`} className="h-8" />;
              const dateValue = toValue(date);
              const selected = selectedDate && toValue(selectedDate) === dateValue;
              const today = dateValue === todayValue();
              const unavailable = isUnavailable(date);
              return (
                <button
                  key={dateValue}
                  type="button"
                  disabled={unavailable}
                  onClick={() => selectDate(date)}
                  className={cn(
                    "mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-xs transition-colors",
                    selected && "bg-stone-900 font-medium text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900",
                    !selected && today && "ring-1 ring-stone-400",
                    !selected && !unavailable && "hover:bg-stone-100 dark:hover:bg-stone-800",
                    unavailable && "cursor-not-allowed text-muted-foreground/35"
                  )}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t pt-2">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                if (!isUnavailable(today)) selectDate(today);
              }}
              disabled={isUnavailable(new Date())}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              今天
            </button>
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              清除
            </button>
          </div>
        </div>
      )}

      {monthOnly && (
        <p className="text-xs text-muted-foreground">当前：{formatEventDate(value)}（请选择具体日期）</p>
      )}
    </div>
  );
}
