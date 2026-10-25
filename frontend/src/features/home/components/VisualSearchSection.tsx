"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Upload,
  Camera,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Search,
} from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function VisualSearchSection() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  return (
    <section id="visual-search" className="bg-white py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="TÍNH NĂNG AI THÔNG MINH"
          title="Tìm hải sản bằng hình ảnh"
          description="Chỉ cần tải ảnh hải sản bạn muốn tìm kiếm, hệ thống AI sẽ phân tích và gợi ý sản phẩm phù hợp tại các vựa."
        />

        <div className="overflow-hidden rounded-3xl border border-sky-200/80 bg-gradient-to-br from-sky-50/40 via-white to-blue-50/30 p-6 shadow-sm lg:p-8">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
            {/* Left Column: Upload Area */}
            <div className="lg:col-span-6">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50/50 p-8 text-center transition-all hover:border-[#0F3860] hover:bg-sky-50"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#0F3860] shadow-sm transition-transform group-hover:scale-110">
                  <Upload className="h-6 w-6" />
                </div>

                <p className="text-sm font-bold text-slate-800">
                  {selectedFileName ? selectedFileName : "Kéo thả hình ảnh vào đây"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  hoặc chọn một trong các phương thức bên dưới
                </p>

                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F3860] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#0A2744]"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Tải ảnh lên</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50"
                  >
                    <Camera className="h-3.5 w-3.5 text-[#0F3860]" />
                    <span>Chụp ảnh từ thiết bị</span>
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <span className="text-[11px] text-slate-400">
                  Định dạng hỗ trợ: JPG, PNG tối đa 10MB
                </span>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#E63946] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#D62839]"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>Tìm kiếm hải sản</span>
                </button>
              </div>
            </div>

            {/* Right Column: AI Recognition Result Demo */}
            <div className="lg:col-span-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-sky-600" />
                    <span className="text-xs font-bold text-slate-800">
                      Kết quả nhận diện được
                    </span>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                    Độ chính xác: 98%
                  </span>
                </div>

                <div className="mt-4 flex gap-4">
                  <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        previewUrl ||
                        "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=400&q=80"
                      }
                      alt="Ảnh mẫu nhận diện"
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="flex-1">
                    <h4 className="text-sm font-extrabold text-[#0F3860]">
                      Tôm Sú Biển Tươi (Penaeus monodon)
                    </h4>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                      Kích cỡ phổ biến: 15-20 con/kg, nguồn gốc: Phú Quốc / Cà
                      Mau. Thích hợp hấp bia, nướng muối ớt.
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 leading-relaxed">
                  <strong>Lưu ý:</strong> Đây là nhận diện bằng AI, có thể so
                  sánh các cửa hàng bên dưới để chọn mức giá và kích thước phù
                  hợp.
                </div>

                <Link
                  href="#featured-seafood"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F3860] py-2.5 text-xs font-bold text-white transition hover:bg-[#0A2744]"
                >
                  <span>Tìm các vựa có bán ngay</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
