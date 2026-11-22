/** Longest side sent to the server; plenty for recognising a species. */
export const PREPARED_MAX_EDGE = 1600;
export const PREPARED_QUALITY = 0.85;
/** The server accepts up to 4MB; stay a little below. */
const SERVER_MAX_BYTES = 3.8 * 1024 * 1024;

function toJpeg(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", PREPARED_QUALITY));
}

/**
 * Shrinks a photo to at most 1600px on its longest side and re-encodes it as
 * JPEG, applying the EXIF rotation, so a 10MB phone photo uploads quickly and
 * stays under the server limit. Falls back to the original file when the
 * browser cannot decode it but it is already small enough.
 */
export async function prepareImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    try {
      const scale = Math.min(1, PREPARED_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("No 2D canvas");
      // JPEG has no transparency: paint PNG/WebP see-through areas white, not black.
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await toJpeg(canvas);
      if (blob && blob.size <= SERVER_MAX_BYTES) return blob;
    } finally {
      bitmap.close();
    }
  } catch {
    // Fall through to the original file below.
  }
  if (file.size <= SERVER_MAX_BYTES) return file;
  throw new Error("Không xử lý được ảnh này. Vui lòng chọn ảnh khác nhỏ hơn.");
}
