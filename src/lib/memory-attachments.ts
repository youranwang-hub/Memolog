import { getSupabase } from "@/lib/supabase";
import type { MemoryAttachment } from "@/lib/types";

export const MEMORY_IMAGE_BUCKET = "memory-images";
export const MAX_MEMORY_IMAGES = 6;
export const MAX_MEMORY_IMAGE_SIZE = 5 * 1024 * 1024;
export const ACCEPTED_MEMORY_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function getFileExtension(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

export function validateMemoryImageFiles(files: File[]) {
  for (const file of files) {
    if (!ACCEPTED_MEMORY_IMAGE_TYPES.includes(file.type)) {
      throw new Error("仅支持 JPG、PNG 或 WebP 图片");
    }
    if (file.size > MAX_MEMORY_IMAGE_SIZE) {
      throw new Error("单张图片不能超过 5MB");
    }
  }
}

export async function fetchMemoryAttachments(memoryId: string) {
  const { data, error } = await getSupabase()
    .from("memory_attachments")
    .select("*")
    .eq("memory_id", memoryId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as MemoryAttachment[];
}

export async function createMemoryImageUrl(storagePath: string) {
  const { data, error } = await getSupabase()
    .storage
    .from(MEMORY_IMAGE_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);

  if (error) throw error;
  return data.signedUrl;
}

export async function uploadMemoryAttachments({
  memoryId,
  userId,
  files,
  startOrder = 0,
}: {
  memoryId: string;
  userId: string;
  files: File[];
  startOrder?: number;
}) {
  validateMemoryImageFiles(files);
  const uploadedPaths: string[] = [];

  try {
    for (const file of files) {
      const storagePath = `${userId}/${memoryId}/${crypto.randomUUID()}.${getFileExtension(file)}`;
      const { error } = await getSupabase()
        .storage
        .from(MEMORY_IMAGE_BUCKET)
        .upload(storagePath, file, { contentType: file.type, upsert: false });

      if (error) throw error;
      uploadedPaths.push(storagePath);
    }

    const { data, error } = await getSupabase()
      .from("memory_attachments")
      .insert(
        uploadedPaths.map((storagePath, index) => ({
          memory_id: memoryId,
          user_id: userId,
          storage_path: storagePath,
          sort_order: startOrder + index,
        }))
      )
      .select();

    if (error) throw error;
    return (data ?? []) as MemoryAttachment[];
  } catch (error) {
    if (uploadedPaths.length > 0) {
      await getSupabase().storage.from(MEMORY_IMAGE_BUCKET).remove(uploadedPaths);
    }
    throw error;
  }
}

export async function deleteMemoryAttachments(attachments: MemoryAttachment[]) {
  if (attachments.length === 0) return;

  const { error: storageError } = await getSupabase()
    .storage
    .from(MEMORY_IMAGE_BUCKET)
    .remove(attachments.map((attachment) => attachment.storage_path));
  if (storageError) throw storageError;

  const { error } = await getSupabase()
    .from("memory_attachments")
    .delete()
    .in("id", attachments.map((attachment) => attachment.id));
  if (error) throw error;
}
