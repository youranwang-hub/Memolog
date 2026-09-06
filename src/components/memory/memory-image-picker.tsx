"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  MAX_MEMORY_IMAGES,
  validateMemoryImageFiles,
} from "@/lib/memory-attachments";
import { compressMemoryImages } from "@/lib/memory-image-processing";
import { toast } from "sonner";

export interface PendingMemoryImage {
  id: string;
  file: File;
  previewUrl: string;
}

interface Props {
  images: PendingMemoryImage[];
  onChange: (images: PendingMemoryImage[]) => void;
  disabled?: boolean;
  compact?: boolean;
  maxImages?: number;
  onProcessingChange?: (processing: boolean) => void;
}

export function MemoryImagePicker({
  images,
  onChange,
  disabled = false,
  compact = false,
  maxImages = MAX_MEMORY_IMAGES,
  onProcessingChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef(images);
  const mounted = useRef(false);
  const busy = useRef(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const previousUrls = new Set(imagesRef.current.map((image) => image.previewUrl));
    const nextUrls = new Set(images.map((image) => image.previewUrl));
    previousUrls.forEach((url) => {
      if (!nextUrls.has(url)) URL.revokeObjectURL(url);
    });
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; imagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl)); };
  }, []);

  async function addFiles(files: File[]) {
    if (files.length === 0 || busy.current) return;
    if (images.length + files.length > maxImages) {
      toast.error(`每条记忆最多添加 ${MAX_MEMORY_IMAGES} 张图片`);
      return;
    }

    try {
      validateMemoryImageFiles(files);
      busy.current = true;
      setProcessing(true);
      onProcessingChange?.(true);
      const compressedFiles = await compressMemoryImages(files);
      if (!mounted.current) return;
      if (imagesRef.current.length + compressedFiles.length > maxImages) throw new Error("图片数量已变化，请重新选择");
      onChange([
        ...imagesRef.current,
        ...compressedFiles.map((file) => ({
          id: crypto.randomUUID(),
          file,
          previewUrl: URL.createObjectURL(file),
        })),
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "图片无法添加");
    } finally {
      busy.current = false;
      if (mounted.current) { setProcessing(false); onProcessingChange?.(false); }
    }
  }

  function removeImage(id: string) {
    onChange(images.filter((image) => image.id !== id));
  }

  return (
    <div className={compact ? "pt-2" : "space-y-2"}>
      {!compact && (
        <div className="flex items-center justify-between gap-3">
          <Label className="text-xs">相关图片</Label>
          <span className="text-[11px] text-muted-foreground">
            {processing ? "正在优化图片..." : `${images.length}/${MAX_MEMORY_IMAGES}`}
          </span>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {images.map((image) => (
          <div key={image.id} className="group relative h-16 w-16 overflow-hidden rounded-md border bg-muted">
            <Image
              src={image.previewUrl}
              alt="待保存的相关图片"
              width={64}
              height={64}
              unoptimized
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => removeImage(image.id)}
              disabled={disabled || processing}
              className="absolute right-1 top-1 rounded-sm bg-background/90 p-0.5 text-foreground opacity-100 sm:opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus:opacity-100 disabled:hidden"
              aria-label="删除图片"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size={compact ? "sm" : "icon"}
          className={compact ? "h-9 w-auto gap-2 border-transparent bg-transparent px-0 text-xs text-muted-foreground" : "h-16 w-16 shrink-0 border-dashed"}
          onClick={() => inputRef.current?.click()}
          disabled={disabled || processing || images.length >= maxImages}
          aria-label="添加图片"
        >
          <ImagePlus className="h-4 w-4" />
          {compact && <span>{processing ? "正在优化图片…" : "添加图片"}</span>}
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(event) => {
          void addFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
    </div>
  );
}
