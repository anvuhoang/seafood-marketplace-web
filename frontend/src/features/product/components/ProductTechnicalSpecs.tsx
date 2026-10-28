"use client";

import { TechnicalSpecifications } from "../types/product.types";
import { FileText, Lightbulb, Fish, Compass, Thermometer, Box, Scale } from "lucide-react";

interface ProductTechnicalSpecsProps {
  specs: TechnicalSpecifications;
}

export function ProductTechnicalSpecs({ specs }: ProductTechnicalSpecsProps) {
  const specItems = [
    {
      label: "TÊN PHỔ THÔNG",
      value: specs.commonName,
      sub: null,
      icon: Fish,
    },
    {
      label: "TÊN KHOA HỌC",
      value: specs.scientificName,
      sub: "Họ Penaeidae",
      isItalic: true,
      icon: FileText,
    },
    {
      label: "MÔI TRƯỜNG NUÔI/BẮT",
      value: specs.habitat,
      sub: null,
      icon: Compass,
    },
    {
      label: "NGUỒN GỐC XUẤT XỨ KHAI THÁC",
      value: specs.origin,
      sub: null,
      icon: Compass,
    },
    {
      label: "PHƯƠNG THỨC ĐÁNH BẮT",
      value: specs.catchMethod,
      sub: null,
      icon: Fish,
    },
    {
      label: "MÔI TRƯỜNG BẢO QUẢN VỰA",
      value: specs.storageCondition,
      sub: null,
      icon: Thermometer,
    },
    {
      label: "QUY CÁCH THUẦN ĐÓNG GÓI",
      value: specs.packagingStandard,
      sub: null,
      icon: Box,
    },
    {
      label: "TỶ LỆ HAO HỤT SAU CHẾ BIẾN",
      value: specs.wasteRatio,
      sub: null,
      icon: Scale,
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
      {/* Title */}
      <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-[#0F3860]">
          <FileText className="h-4 w-4" />
        </div>
        <h2 className="text-base font-bold text-slate-900 tracking-tight">
          Thông Số Chuyên Ngành Thủy Sản
        </h2>
      </div>

      {/* 8-Grid Specs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {specItems.map((item, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 transition-colors hover:bg-slate-100/60"
          >
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {item.label}
            </div>
            <div
              className={`mt-1 text-xs font-bold text-slate-800 ${
                item.isItalic ? "italic text-slate-700" : ""
              }`}
            >
              {item.value}
            </div>
            {item.sub && (
              <div className="text-[10px] text-slate-400 mt-0.5">{item.sub}</div>
            )}
          </div>
        ))}
      </div>

      {/* Culinary Advice callout */}
      {specs.culinaryAdvice && (
        <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-4">
          <div className="flex items-start gap-2.5">
            <Lightbulb className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-sky-950">
                Lời khuyên ẩm thực từ chuyên trường vựa:
              </h4>
              <p className="text-xs text-sky-900/90 leading-relaxed">
                {specs.culinaryAdvice}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
