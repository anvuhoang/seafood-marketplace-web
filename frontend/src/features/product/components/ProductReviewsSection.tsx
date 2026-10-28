"use client";

import { useState } from "react";
import { ReviewsSummary } from "../types/product.types";
import { Star, ShieldCheck, CheckCircle2, Image as ImageIcon } from "lucide-react";

interface ProductReviewsSectionProps {
  summary: ReviewsSummary;
}

export function ProductReviewsSection({ summary }: ProductReviewsSectionProps) {
  const [activeFilter, setActiveFilter] = useState("all");

  const filterChips = [
    { id: "all", label: `Tất cả (${summary.reviewCount})` },
    { id: "media", label: "Có hình ảnh & video (86)" },
    { id: "alive", label: "Tôm còn sống khỏe (112)" },
    { id: "fast", label: "Giao đúng 2 giờ (44)" },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Đánh Giá Thực Từ Khách Mua Hàng
          </h2>
          <p className="text-xs text-slate-400">
            Tất cả các đánh giá đều được xác thực mua hàng từ vựa
          </p>
        </div>
      </div>

      {/* Rating Breakdown Overview */}
      <div className="flex flex-col sm:flex-row items-center gap-8 rounded-xl bg-slate-50 p-5 border border-slate-100">
        {/* Left: Overall Score */}
        <div className="text-center sm:text-left sm:pr-8 sm:border-r border-slate-200">
          <div className="text-4xl font-black text-[#0F3860]">
            {summary.ratingAverage.toFixed(1)}
          </div>
          <div className="flex items-center justify-center sm:justify-start gap-1 my-1 text-amber-400">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} className="h-4 w-4 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <div className="text-xs text-slate-500 font-medium">
            {summary.reviewCount} đánh giá từ khách hàng
          </div>
        </div>

        {/* Right: Star Bar Breakdown */}
        <div className="flex-1 w-full space-y-1.5 text-xs text-slate-600">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = summary.ratingBreakdown[stars] || 0;
            const percent = Math.round((count / summary.reviewCount) * 100);
            return (
              <div key={stars} className="flex items-center gap-3">
                <span className="w-10 text-right font-medium">{stars} sao</span>
                <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-[#E63946] rounded-full transition-all duration-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="w-8 text-slate-400 font-mono text-[11px]">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap items-center gap-2">
        {filterChips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => setActiveFilter(chip.id)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeFilter === chip.id
                ? "bg-[#0F3860] text-white shadow-xs"
                : "border border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Review Cards List */}
      <div className="space-y-4 pt-2">
        {summary.reviews.map((rev) => (
          <div
            key={rev.id}
            className="rounded-xl border border-slate-100 bg-white p-4 space-y-3 transition-colors hover:border-slate-200"
          >
            {/* User Meta */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 font-bold text-xs text-[#0F3860]">
                  {rev.authorName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    {rev.authorName}
                  </h4>
                  {rev.authorSub && (
                    <p className="text-[11px] text-slate-400">{rev.authorSub}</p>
                  )}
                </div>
              </div>

              {rev.verifiedPurchase && (
                <span className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  Đã xác thực người mua
                </span>
              )}
            </div>

            {/* Rating Stars */}
            <div className="flex items-center gap-1 text-amber-400">
              {Array.from({ length: rev.rating }).map((_, i) => (
                <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              ))}
              <span className="text-xs text-slate-400 ml-2">{rev.date}</span>
            </div>

            {/* Comment Text */}
            <p className="text-xs text-slate-700 leading-relaxed">
              {rev.content}
            </p>

            {/* Photos if any */}
            {rev.photos && rev.photos.length > 0 && (
              <div className="flex items-center gap-2 pt-1">
                {rev.photos.map((photo, pIdx) => (
                  <div
                    key={pIdx}
                    className="relative h-16 w-16 overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo}
                      alt="Review attachment"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
