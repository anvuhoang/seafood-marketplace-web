"use client";

import { ShieldCheck, Thermometer, Clock, Sparkles } from "lucide-react";

export function ColdChainStandardCard() {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#0F3860] to-[#081B2E] p-5 text-white shadow-md space-y-4">
      {/* Title */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <ShieldCheck className="h-5 w-5 text-cyan-400" />
        <h3 className="text-xs font-bold text-white tracking-wide uppercase">
          Quy Chuẩn Thùng Oxy Cứu Sống
        </h3>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed">
        Mỗi đơn hàng tôm sống được đóng thùng xốp đặc biệt kèm đá gel cay duy trì độ mặn và nhiệt độ tự nhiên. Tỉ lệ tôm sống khi giao tận tay đạt 100% nhờ nén khí oxy tinh khiết.
      </p>

      {/* Specifications list */}
      <div className="space-y-2.5 pt-1 text-xs">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <span className="flex items-center gap-2 text-slate-300">
            <Thermometer className="h-4 w-4 text-cyan-400" />
            Nhiệt độ nước bảo quản:
          </span>
          <span className="font-bold text-white font-mono">20°C - 22°C</span>
        </div>

        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <span className="flex items-center gap-2 text-slate-300">
            <Clock className="h-4 w-4 text-cyan-400" />
            Thời gian bơi sống an toàn:
          </span>
          <span className="font-bold text-white font-mono">
            4 giờ - 6 giờ bơi sống
          </span>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="flex items-center gap-2 text-slate-300">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            Tỷ lệ sống khi nhận:
          </span>
          <span className="font-extrabold text-emerald-400 font-mono">
            100% gõ vỏ bơi ngay
          </span>
        </div>
      </div>
    </div>
  );
}
