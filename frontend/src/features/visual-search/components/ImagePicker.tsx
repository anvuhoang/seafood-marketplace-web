"use client";

import { useRef, useState } from "react";
import { Camera, ImageUp, Info, RefreshCw, Trash2 } from "lucide-react";
import { VISUAL_SEARCH_ACCEPTED_TYPES } from "../api/visual-search.api";
import type { SelectedImage } from "../hooks/useVisualSearch";

interface ImagePickerProps {
  image: SelectedImage | null;
  inputError: string | null;
  onSelect: (file: File | undefined) => void;
  onClear: () => void;
}

/** Drop, choose or take a photo; shows the preview with "replace" and "remove". */
export function ImagePicker({ image, inputError, onSelect, onClear }: ImagePickerProps) {
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      {image ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
          <img
            src={image.url}
            alt="Ảnh hải sản bạn đã chọn để tìm"
            className="aspect-4/3 w-full object-contain"
          />
        </div>
      ) : (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            onSelect(event.dataTransfer.files[0]);
          }}
          className={`flex aspect-4/3 flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 text-center transition-colors ${
            dragging ? "border-[#0F3860] bg-sky-50" : "border-slate-300 bg-slate-50"
          }`}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[#0F3860] shadow-sm">
            <ImageUp className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="mt-4 font-semibold text-slate-900">Kéo thả ảnh vào đây</p>
          <p className="mt-1 text-sm text-slate-500">hoặc chọn từ máy, chụp bằng điện thoại</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Chọn ảnh từ máy"
              className="inline-flex items-center gap-2 rounded-lg bg-[#0F3860] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0A2744]"
            >
              <ImageUp className="h-4 w-4" aria-hidden="true" /> Chọn ảnh
            </button>
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              aria-label="Chụp ảnh bằng máy ảnh"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-400"
            >
              <Camera className="h-4 w-4" aria-hidden="true" /> Chụp ảnh
            </button>
          </div>
        </div>
      )}

      {image && (
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Thay ảnh khác"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-50 px-3 py-2.5 text-sm font-semibold text-[#0F3860] hover:bg-sky-100"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Thay ảnh khác
          </button>
          <button
            type="button"
            onClick={onClear}
            aria-label="Xóa ảnh đã chọn"
            className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-[#C62835] hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" /> Xóa ảnh
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={VISUAL_SEARCH_ACCEPTED_TYPES.join(",")}
        className="hidden"
        onChange={(event) => {
          onSelect(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          onSelect(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      <p
        role={inputError ? "alert" : undefined}
        className={`mt-3 flex items-start gap-1.5 text-xs ${inputError ? "text-[#C62835]" : "text-slate-500"}`}
      >
        <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {inputError ?? "Hỗ trợ JPG, PNG, WebP, tối đa 10MB"}
      </p>
    </div>
  );
}
