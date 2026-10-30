"use client";

import { useState } from "react";
import { ProductImage } from "../types/product.types";
import { ZoomIn, Video, X, ShieldCheck } from "lucide-react";

interface ProductImagesGalleryProps {
  images: ProductImage[];
  productName: string;
}

export function ProductImagesGallery({
  images,
  productName,
}: ProductImagesGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [videoCallOpen, setVideoCallOpen] = useState(false);

  const currentImage = images[selectedIndex] || images[0];

  return (
    <div className="space-y-4">
      {/* 1. Main Preview Box */}
      <div className="group relative aspect-4/3 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-xs">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentImage?.imageUrl}
          alt={currentImage?.altText || productName}
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />

        {/* Zoom Button */}
        <button
          type="button"
          onClick={() => setZoomOpen(true)}
          className="absolute right-3 bottom-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/90 text-slate-700 shadow-md backdrop-blur-xs transition hover:bg-white hover:text-[#0F3860] active:scale-95"
          title="Phóng to ảnh chi tiết"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
      </div>

      {/* 2. Thumbnails Strip */}
      <div className="grid grid-cols-4 gap-3">
        {images.map((img, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <button
              key={img.id || idx}
              type="button"
              onClick={() => setSelectedIndex(idx)}
              className={`relative aspect-4/3 overflow-hidden rounded-xl border-2 transition-all duration-200 ${
                isSelected
                  ? "border-[#0F3860] shadow-sm scale-102"
                  : "border-slate-200 opacity-75 hover:opacity-100 hover:border-slate-300"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.imageUrl}
                alt={img.altText || `${productName} thumbnail ${idx + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          );
        })}
      </div>

      {/* 3. Live Cam Inspection Banner */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200/80 bg-rose-50/60 p-3.5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E63946] text-white shadow-xs">
            <Video className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">
              Xem Cá Hồ Trực Tiếp Tại Hồ
            </h4>
            <p className="text-[11px] text-slate-500 line-clamp-1">
              Nhấn vào cam quay các bồn tôm đang bơi lội trước khi đóng thùng
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setVideoCallOpen(true)}
          className="shrink-0 rounded-xl border border-rose-300 bg-white px-3.5 py-1.5 text-xs font-bold text-[#E63946] shadow-2xs transition hover:bg-rose-500 hover:text-white active:scale-95"
        >
          Yêu cầu Video Call
        </button>
      </div>

      {/* Zoom Modal */}
      {zoomOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-fade-in">
          <div className="relative max-w-4xl w-full max-h-[90vh] overflow-hidden rounded-2xl bg-white p-2">
            <button
              onClick={() => setZoomOpen(false)}
              className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/70 text-white hover:bg-slate-900"
            >
              <X className="h-5 w-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentImage?.imageUrl}
              alt={productName}
              className="w-full max-h-[85vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}

      {/* Simulated Live Video Call Modal */}
      {videoCallOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-slate-950 text-white shadow-2xl border border-slate-800">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-bold text-white">
                  LIVE CAM • Bồn Tôm Sú Hồ 03 (Vựa Phú Quốc Xanh)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setVideoCallOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Simulated Live Stream Feed */}
            <div className="relative aspect-video w-full bg-slate-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=1000&q=80"
                alt="Live tank stream"
                className="h-full w-full object-cover"
              />
              <div className="absolute top-3 left-3 rounded-md bg-black/60 px-2 py-1 text-[10px] font-mono text-emerald-400 backdrop-blur-xs">
                REC • 1080p 60fps • Oxy: 9.2mg/L • Salt: 31‰
              </div>
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-lg bg-black/65 px-3 py-1.5 text-xs backdrop-blur-xs">
                <span className="flex items-center gap-1.5 text-[11px] text-slate-300">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  Kỹ thuật viên đang trực hồ chọn tôm sống
                </span>
                <span className="font-mono text-[10px] text-slate-400">
                  27/10/2026
                </span>
              </div>
            </div>

            {/* Footer action */}
            <div className="flex items-center justify-between bg-slate-900/90 p-3.5">
              <p className="text-[11px] text-slate-400">
                Nhân viên sẽ cân đúng con bơi khỏe và đóng thùng có gắn mã QR quay clip.
              </p>
              <button
                type="button"
                onClick={() => setVideoCallOpen(false)}
                className="rounded-xl bg-[#0F3860] px-4 py-1.5 text-xs font-bold text-white transition hover:bg-[#0A2744]"
              >
                Xác nhận đã xem
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
