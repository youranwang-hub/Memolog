"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CalendarIcon, XIcon } from "lucide-react";
import { formatEventDate } from "@/lib/dates";

const TODAY = (() => {
  const d = new Date();
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
})();

/** 把 yyyy-MM-dd 格式化为 yyyy/MM/dd */
function formatDisplay(val: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return "";
  const [y, mo, d] = val.split("-");
  return `${y}/${Number(mo)}/${Number(d)}`;
}

/**
 * 日期选择器。
 * - 点击整个输入框任意位置弹出原生日历
 * - 选中后在输入框显示 yyyy/MM/dd
 * - 不允许选择今天之后的日期
 */
export function DatePicker({
  value,
  onChange,
  label = "日期",
}: {
  value: string;
  onChange: (val: string) => void;
  label?: string;
}) {
  const dateRef = useRef<HTMLInputElement>(null);
  const [pickerValue, setPickerValue] = useState<string>(
    value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "",
  );

  // 外部 value 变化时同步
  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      setPickerValue(value);
    } else if (value && /^\d{4}-\d{2}$/.test(value)) {
      setPickerValue("");
    }
  }, [value]);

  const displayText = formatDisplay(pickerValue);

  /** 弹出原生日历 */
  const openPicker = useCallback(() => {
    dateRef.current?.showPicker();
  }, []);

  /** 日历选择变化 */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value; // yyyy-MM-dd
      // 额外防御：如果浏览器没有遵守 max 属性
      if (val > TODAY) return;
      setPickerValue(val);
      onChange(val);
    },
    [onChange],
  );

  /** 清空 */
  const handleClear = useCallback(() => {
    setPickerValue("");
    onChange("");
    if (dateRef.current) dateRef.current.value = "";
  }, [onChange]);

  const monthOnly =
    value && /^\d{4}-\d{2}$/.test(value) && !pickerValue;

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>

      <div className="flex items-center gap-2">
        {/* 外层可点击区域，点击即弹日历 */}
        <div
          className="relative flex-1 cursor-pointer"
          onClick={openPicker}
        >
          {/* 展示用的 Input（readOnly，显示 yyyy/MM/dd） */}
          <Input
            value={displayText}
            placeholder="YYYY/MM/DD"
            readOnly
            className="h-8 text-sm pr-7"
          />

          {/* 日历图标（装饰，也触发点击） */}
          <CalendarIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />

          {/* 原生 date input：绝对定位铺满，透明度 0，负责弹日历 */}
          <input
            ref={dateRef}
            type="date"
            value={pickerValue}
            max={TODAY}
            onChange={handleChange}
            className="absolute inset-0 w-full cursor-pointer opacity-0"
            tabIndex={-1}
          />
        </div>

        {pickerValue && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
          >
            <XIcon className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {monthOnly && (
        <p className="text-xs text-muted-foreground">
          当前：{formatEventDate(value)}（请选择具体日期）
        </p>
      )}
    </div>
  );
}
