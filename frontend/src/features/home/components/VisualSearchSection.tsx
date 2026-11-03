"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Camera, ImageUp, Loader2, ScanSearch, Search, X } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { CatalogProductCard } from "@/features/catalog/components/CatalogProductCard";
import {
  VISUAL_SEARCH_ACCEPTED_TYPES,
  VISUAL_SEARCH_MAX_BYTES,
  searchByImage,
} from "@/features/visual-search/api/visual-search.api";
import { VisualSearchResult } from "@/features/visual-search/types/visual-search.types";

const STEPS = [
  "Chụp hoặc tải lên ảnh hải sản bạn muốn mua",
  "Hệ thống nhận diện loài và kích cỡ phổ biến",
  "Chọn vựa đang bán với giá phù hợp",
];

type Status =
  | { kind: "idle" }
  | { kind: "searching" }
  | { kind: "done"; result: VisualSearchResult }
  | { kind: "error"; message: string };

export function VisualSearchSection() {
  const [image, setImage] = useState<{ file: File; url: string } | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [inputError, setInputError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Release the preview URL when the image changes or the section unmounts.
  useEffect(() => {
    return () => {
      if (image) URL.revokeObjectURL(image.url);
    };
  }, [image]);

  const selectFile = (file: File | undefined) => {
    if (!file) return;
    if (!VISUAL_SEARCH_ACCEPTED_TYPES.includes(file.type)) {
      setInputError("Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.");
      return;
    }
    if (file.size > VISUAL_SEARCH_MAX_BYTES) {
      setInputError("Ảnh tối đa 10MB.");
      return;
    }
    setInputError(null);
    setStatus({ kind: "idle" });
    setImage({ file, url: URL.createObjectURL(file) });
  };

  const clearImage = () => {
    setImage(null);
    setStatus({ kind: "idle" });
  };

  const handleSearch = async () => {
    if (!image) return;
    setStatus({ kind: "searching" });
    try {
      setStatus({ kind: "done", result: await searchByImage(image.file) });
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Không nhận diện được ảnh. Vui lòng thử ảnh khác.",
      });
    }
  };

  return (
    <section id="visual-search" className="scroll-mt-32 bg-white py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Tìm kiếm bằng AI"
          title="Tìm hải sản bằng hình ảnh"
          description="Tải ảnh loại hải sản bạn muốn mua, hệ thống nhận diện và gợi ý các vựa đang bán để bạn so sánh."
        />

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Upload */}
          <ScrollReveal>
            {image ? (
              <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt="Ảnh đã chọn" className="aspect-4/3 w-full object-contain" />
                <button
                  type="button"
                  onClick={clearImage}
                  aria-label="Bỏ ảnh đã chọn"
                  className="absolute top-3 right-3 rounded-full bg-white/90 p-1.5 text-slate-700 shadow-sm hover:text-[#E63946]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  selectFile(e.dataTransfer.files[0]);
                }}
                className={`flex aspect-4/3 flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 text-center transition-colors ${
                  dragging ? "border-[#0F3860] bg-sky-50" : "border-slate-300 bg-slate-50"
                }`}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[#0F3860] shadow-sm">
                  <ImageUp className="h-6 w-6" />
                </span>
                <p className="mt-4 font-semibold text-slate-900">Kéo thả ảnh vào đây</p>
                <p className="mt-1 text-sm text-slate-500">hoặc chọn từ máy, chụp bằng điện thoại</p>
                <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#0F3860] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0A2744]"
                  >
                    <ImageUp className="h-4 w-4" /> Chọn ảnh
                  </button>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-400"
                  >
                    <Camera className="h-4 w-4" /> Chụp ảnh
                  </button>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept={VISUAL_SEARCH_ACCEPTED_TYPES.join(",")}
              className="hidden"
              onChange={(e) => {
                selectFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                selectFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className={`text-xs ${inputError ? "text-[#C62835]" : "text-slate-500"}`}>
                {inputError ?? "JPG, PNG hoặc WebP, tối đa 10MB"}
              </p>
              <button
                type="button"
                onClick={() => void handleSearch()}
                disabled={!image || status.kind === "searching"}
                className="inline-flex items-center gap-2 rounded-lg bg-[#E63946] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#D62839] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status.kind === "searching" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Tìm hải sản
              </button>
            </div>
          </ScrollReveal>

          {/* Result */}
          <ScrollReveal delay={120} className="rounded-2xl border border-slate-200 p-6 sm:p-8">
            <h3 className="flex items-center gap-2 font-semibold text-slate-900">
              <ScanSearch className="h-5 w-5 text-[#0F3860]" /> Kết quả nhận diện
            </h3>

            {status.kind === "searching" ? (
              <div className="flex flex-col items-center py-16 text-sm text-slate-500">
                <Loader2 className="h-6 w-6 animate-spin text-[#0F3860]" />
                <p className="mt-3">Đang phân tích ảnh...</p>
              </div>
            ) : status.kind === "error" ? (
              <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                <p>{status.message}</p>
                <Link href="/products" className="mt-2 inline-block font-semibold underline underline-offset-4">
                  Tìm bằng từ khóa
                </Link>
              </div>
            ) : status.kind === "done" ? (
              <div className="mt-5">
                <p className="text-sm text-slate-600">
                  Có vẻ đây là <span className="font-semibold text-slate-900">{status.result.label}</span>
                  <span className="text-slate-400"> · độ tin cậy {Math.round(status.result.confidence * 100)}%</span>
                </p>
                {status.result.products.length > 0 ? (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {status.result.products.slice(0, 4).map((product) => (
                      <CatalogProductCard key={product.id} product={product} view="grid" />
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">Hiện chưa có vựa nào bán loại này.</p>
                )}
              </div>
            ) : (
              <ol className="mt-6 space-y-5">
                {STEPS.map((step, index) => (
                  <li key={step} className="flex gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sm font-semibold text-[#0F3860] tabular-nums">
                      {index + 1}
                    </span>
                    <p className="pt-1 text-sm leading-relaxed text-slate-600">{step}</p>
                  </li>
                ))}
              </ol>
            )}
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
