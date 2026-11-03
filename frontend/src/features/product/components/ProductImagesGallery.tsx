"use client";

import { useState } from "react";
import { ProductImage } from "../types/product.types";
import { Fish, ZoomIn, X } from "lucide-react";

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

  const currentImage = images[selectedIndex] || images[0];

  if (!currentImage) {
    return (
      <div className="flex aspect-4/3 w-full flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">
        <Fish className="h-12 w-12" />
        <p className="mt-2 text-xs">Vựa chưa cập nhật hình ảnh</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 1. Main Preview Box */}
      <div className="group relative aspect-4/3 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-xs">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentImage.imageUrl}
          alt={currentImage.altText || productName}
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
      {images.length > 1 && (
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
      )}

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
              src={currentImage.imageUrl}
              alt={productName}
              className="w-full max-h-[85vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
