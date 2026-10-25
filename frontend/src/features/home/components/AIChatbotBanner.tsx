import Link from "next/link";
import { Bot, Sparkles, MessageSquareText } from "lucide-react";

export function AIChatbotBanner() {
  const suggestions = [
    "Gợi ý hải sản cho lẩu hải sản",
    "Tiệc BBQ cua ghẹ cho 6 người",
    "Thực đơn hải sản thanh mát cuối tuần",
  ];

  return (
    <section className="bg-white pb-14 sm:pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-r from-sky-50 via-blue-50/50 to-indigo-50/30 p-7 lg:p-10">
          <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            {/* Left Content */}
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-[#0F3860] shadow-xs">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>Trợ lý tư vấn ẩm thực & thực đơn</span>
              </div>

              <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                Chưa biết chọn hải sản nào cho bữa tiệc hôm nay?
              </h3>

              <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">
                Trợ lý AI của HaiSan Express có thể gợi ý thực đơn cho 4 - 10 người,
                tính toán định lượng hải sản cần mua và gợi ý các vựa có mức giá tốt
                nhất.
              </p>

              {/* Suggestions chips */}
              <div className="mt-4 flex flex-wrap gap-2">
                {suggestions.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs backdrop-blur-xs"
                  >
                    <span>💡</span>
                    <span>{item}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Right Action */}
            <div className="flex shrink-0 flex-col items-start gap-2 sm:items-center lg:items-end">
              <Link
                href="#chat-ai"
                className="inline-flex items-center gap-2 rounded-xl bg-[#E63946] px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-red-500/20 transition-all hover:bg-[#D62839] hover:shadow-lg active:scale-98"
              >
                <Bot className="h-4 w-4" />
                <span>Hỏi AI Chatbot ngay</span>
              </Link>
              <span className="text-[11px] text-slate-500">
                Hỗ trợ 24/7 hoàn toàn miễn phí
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
