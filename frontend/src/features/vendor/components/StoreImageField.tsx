"use client";

import { useId, useRef, useState } from "react";
import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface StoreImageFieldProps {
  label: string;
  hint: string;
  /** "square" for the logo, "wide" for the cover. */
  shape: "square" | "wide";
  value: string;
  uploadEnabled: boolean;
  disabled: boolean;
  /** Uploads one file and resolves to its URL; throws with a readable message. */
  upload: (file: File) => Promise<string>;
  onChange: (url: string) => void;
  onUploadingChange: (uploading: boolean) => void;
}

/** Preview of one store image, with change and remove buttons. */
export function StoreImageField({
  label,
  hint,
  shape,
  value,
  uploadEnabled,
  disabled,
  upload,
  onChange,
  onUploadingChange,
}: StoreImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const errorId = useId();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);
    onUploadingChange(true);
    try {
      onChange(await upload(file));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Tải ảnh lên không thành công. Vui lòng thử lại.");
    } finally {
      setUploading(false);
      onUploadingChange(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const busy = disabled || uploading;

  return (
    <div className="min-w-0">
      <p className="text-sm font-semibold text-slate-800">{label}</p>
      <p id={hintId} className="mt-0.5 text-xs text-slate-500">
        {hint}
      </p>

      <div
        className={cn(
          "relative mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-100",
          shape === "square" ? "aspect-square w-32" : "aspect-[3/1] w-full",
        )}
      >
        {value ? (
          // Cloudinary or seeded URLs; next/image is not configured for remote hosts.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={`${label} hiện tại`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-400">
            <ImageIcon className="h-6 w-6" aria-hidden="true" />
            <span className="text-xs">Chưa có ảnh</span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/75" role="status">
            <Loader2 className="h-5 w-5 animate-spin text-[#0F3860] motion-reduce:animate-none" aria-hidden="true" />
            <span className="sr-only">Đang tải ảnh lên</span>
          </div>
        )}
      </div>

      {uploadEnabled && (
        <div className="mt-3 flex flex-wrap gap-2">
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
            aria-describedby={error ? `${hintId} ${errorId}` : hintId}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            {uploading ? "Đang tải lên..." : value ? "Đổi ảnh" : "Tải ảnh lên"}
          </button>
          {value && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setError(null);
                onChange("");
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Xóa ảnh
            </button>
          )}
        </div>
      )}

      {error && (
        <p id={errorId} role="alert" className="mt-2 text-xs text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}
