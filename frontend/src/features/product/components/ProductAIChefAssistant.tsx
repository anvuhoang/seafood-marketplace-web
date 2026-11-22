"use client";

import { useState } from "react";
import { Sparkles, ChevronRight, Bot, MessageCircle } from "lucide-react";

export function ProductAIChefAssistant() {
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);

  const promptAnswers: Record<string, string> = {
    "Tôm sú loại này làm món gì ngon nhất?":
      "Tôm sú biển size 15-20 con/kg vỏ mỏng thịt giòn ngọt tự nhiên. 3 món ngon đỉnh nhất: 1. Nướng mọi muối ớt chấm muối ớt xanh (giữ trọn vị ngọt biển); 2. Hấp nước dừa xiêm hoặc bia tươi sả gừng (thịt săn chắc mọng nước); 3. Tôm sốt bơ tỏi ăn kèm bánh mì nóng giòn.",
    "Nấu món gì ngon và người lớn thích?":
      "Đối với người lớn tuổi hoặc tiệc gia đình, món Tôm sú hấp miến tỏi Hong Kong hoặc Canh chua tôm sú nấu thơm cà chua là tuyệt nhất: thanh mát, giàu canxi, thịt mềm ngọt và dễ tiêu hóa.",
    "Tôm để ngăn đông bảo quản được bao lâu?":
      "Nếu quý khách chọn phương án 'Hút chân không cấp đông -18°C', tôm bảo quản được tốt nhất trong 30-45 ngày mà không mất độ ngọt. Nếu để ngăn mát chỉ nên chế biến trong vòng 12-24 giờ.",
  };

  const handleSelectPrompt = (q: string) => {
    setActiveQuestion(q);
    setAiAnswer(promptAnswers[q] || "Đang kết nối AI Bếp Thủy Sản...");
  };

  return (
    <div className="rounded-2xl border border-sky-200 bg-white p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-sky-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-xs">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900">
              Trợ Lý AI Bếp Thủy Sản
            </h3>
            <p className="text-[10px] text-slate-400">
              Tư vấn công thức & chế biến hải sản
            </p>
          </div>
        </div>
        <span className="rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700 border border-sky-200">
          Trực Tuyến
        </span>
      </div>

      {/* Intro chat bubble */}
      <div className="rounded-xl bg-sky-50/70 p-3 text-xs text-sky-950/90 leading-relaxed border border-sky-100/80">
        <div className="flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <span>
            Chào bạn! Tôi có thể tư vấn định lượng tôm phù hợp với số lượng khách tiệc của gia đình bạn, chọn gia vị ướp ngon nhất hoặc mẹo luộc tôm giòn thịt chuẩn khách sạn 5 sao.
          </span>
        </div>
      </div>

      {/* Suggested prompt chips / questions */}
      <div className="space-y-1.5">
        {Object.keys(promptAnswers).map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSelectPrompt(q)}
            className={`flex w-full items-center justify-between rounded-xl border p-2.5 text-left text-xs font-semibold transition-all duration-200 ${
              activeQuestion === q
                ? "border-sky-500 bg-sky-50 text-[#0F3860] shadow-xs"
                : "border-slate-100 bg-slate-50/80 text-slate-700 hover:border-slate-200 hover:bg-slate-100"
            }`}
          >
            <span className="line-clamp-1">{q}</span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          </button>
        ))}
      </div>

      {/* AI Answer preview box */}
      {aiAnswer && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-xs text-slate-800 space-y-1 animate-slide-up">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-900">
            <MessageCircle className="h-3.5 w-3.5 text-indigo-600" />
            <span>Đầu Bếp AI Phản Hồi:</span>
          </div>
          <p className="text-slate-700 leading-relaxed">{aiAnswer}</p>
        </div>
      )}
    </div>
  );
}
