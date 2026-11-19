"use client";

import { useId, useRef, useState } from "react";
import { ImageIcon, Info, Loader2, Star, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ImageFormValue } from "../utils/vendor-product-form";
import { PRODUCT_LIMITS } from "../utils/vendor-product-form";

interface ProductImagesFieldProps {
  images: ImageFormValue[];
  error?: string;
  uploadEnabled: boolean;
  disabled: boolean;
  /** Uploads one file and resolves to its URL; throws with a readable message. */
  upload: (file: File) => Promise<string>;
  onChange: (images: ImageFormValue[]) => void;
  onUploadingChange: (uploading: boolean) => void;
}

/** Up to five product images; exactly one is marked as the primary image. */
export function ProductImagesField({
  images,
  error,
  uploadEnabled,
  disabled,
  upload,
  onChange,
  onUploadingChange,
}: ProductImagesFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const errorId = useId();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const full = images.length >= PRODUCT_LIMITS.imagesMax;

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    onUploadingChange(true);
    try {
      const url = await upload(file);
      // The first image becomes the primary one.
      onChange([...images, { imageUrl: url, isPrimary: images.length === 0 }]);
    } catch (uploadFailure) {
      setUploadError(uploadFailure instanceof Error ? uploadFailure.message : "Tải ảnh lên không thành công. Vui lòng thử lại.");
    } finally {
      setUploading(false);
      onUploadingChange(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove(index: number) {
    const next = images.filter((_, i) => i !== index);
    // Keep exactly one primary image when the primary one is removed.
    if (images[index]?.isPrimary && next.length > 0) next[0] = { ...next[0]!, isPrimary: true };
    onChange(next);
  }

  const setPrimary = (index: number) => onChange(images.map((image, i) => ({ ...image, isPrimary: i === index })));
  const busy = disabled || uploading;
  const message = uploadError ?? error;

  return (
    <div className="min-w-0">
      <p id={hintId} className="text-xs text-slate-500">
        Tối đa {PRODUCT_LIMITS.imagesMax} ảnh JPG, PNG hoặc WebP, mỗi ảnh tối đa 5MB. Ảnh đại diện hiển thị đầu tiên.
      </p>

      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {images.map((image, index) => (
          <li
            key={image.imageUrl}
            className={cn(
              "relative min-w-0 overflow-hidden rounded-xl border bg-slate-100",
              image.isPrimary ? "border-brand ring-2 ring-brand/30" : "border-slate-200",
            )}
          >
            {/* Cloudinary URLs; next/image is not configured for remote hosts. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.imageUrl} alt={`Ảnh sản phẩm ${index + 1}`} className="aspect-square w-full object-cover" />
            <div className="flex items-center justify-between gap-1 bg-white p-1.5">
              <button
                type="button"
                onClick={() => setPrimary(index)}
                disabled={busy || image.isPrimary}
                aria-pressed={image.isPrimary}
                className={cn(
                  "inline-flex min-w-0 items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-semibold",
                  image.isPrimary ? "text-brand" : "text-slate-600 hover:bg-slate-100",
                )}
              >
                <Star className={cn("h-3.5 w-3.5 shrink-0", image.isPrimary && "fill-current")} aria-hidden="true" />
                <span className="truncate">{image.isPrimary ? "Ảnh đại diện" : "Đặt đại diện"}</span>
              </button>
              <button
                type="button"
                onClick={() => remove(index)}
                disabled={busy}
                aria-label={`Xóa ảnh ${index + 1}`}
                className="rounded-md p-1 text-rose-700 hover:bg-rose-50 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </li>
        ))}

        {uploadEnabled && !full && (
          <li className="min-w-0">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              disabled={busy}
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              aria-describedby={message ? `${hintId} ${errorId}` : hintId}
              className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-brand motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <Upload className="h-5 w-5" aria-hidden="true" />
              )}
              {uploading ? "Đang tải lên..." : "Thêm ảnh"}
            </button>
          </li>
        )}
      </ul>

      {images.length === 0 && !uploadEnabled && (
        <p className="mt-3 flex gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
          Chức năng tải ảnh chưa được cấu hình trên hệ thống. Bạn vẫn có thể gửi sản phẩm không có ảnh và bổ sung sau.
        </p>
      )}
      {images.length === 0 && uploadEnabled && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
          <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
          Chưa có ảnh nào.
        </p>
      )}
      {message && (
        <p id={errorId} role="alert" className="mt-2 text-xs text-rose-700">
          {message}
        </p>
      )}
    </div>
  );
}
