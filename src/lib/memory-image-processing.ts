const MAX_IMAGE_DIMENSION = 1600;
const TARGET_IMAGE_SIZE = 1200 * 1024;

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
}

async function loadImage(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function compressMemoryImage(file: File) {
  const image = await loadImage(file);
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) return file;
  context.drawImage(image, 0, 0, width, height);

  let output: Blob | null = null;
  for (const quality of [0.82, 0.72, 0.62]) {
    const candidate = await canvasToBlob(canvas, quality);
    if (!candidate) continue;
    output = candidate;
    if (candidate.size <= TARGET_IMAGE_SIZE) break;
  }

  if (!output || output.size >= file.size) return file;
  const name = file.name.replace(/\.[^.]+$/, "") || "memory-image";
  return new File([output], `${name}.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}

export async function compressMemoryImages(files: File[]) {
  const compressed: File[] = [];
  for (const file of files) {
    compressed.push(await compressMemoryImage(file));
  }
  return compressed;
}
