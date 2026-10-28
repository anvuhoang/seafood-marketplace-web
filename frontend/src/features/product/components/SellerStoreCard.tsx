"use client";

import { useState } from "react";
import Link from "next/link";
import { VendorDetail } from "../types/product.types";
import {
  Anchor,
  ShieldCheck,
  MessageSquare,
  Store,
  X,
  Send,
  MapPin,
} from "lucide-react";

interface SellerStoreCardProps {
  vendor: VendorDetail;
}

export function SellerStoreCard({ vendor }: SellerStoreCardProps) {
  const [chatOpen, setChatOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<
    Array<{ sender: "user" | "vendor"; text: string; time: string }>
  >([
    {
      sender: "vendor",
      text: "Xin chào quý khách! Vựa Thủy Sản Phú Quốc Xanh luôn sẵn sàng hỗ trợ. Quý khách muốn xem video hồ tôm hay tư vấn giao gấp 2 giờ ạ?",
      time: "Vừa xong",
    },
  ]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMsg = message.trim();
    const newHistory = [
      ...chatHistory,
      { sender: "user" as const, text: userMsg, time: "Bây giờ" },
    ];
    setChatHistory(newHistory);
    setMessage("");

    setTimeout(() => {
      setChatHistory([
        ...newHistory,
        {
          sender: "vendor" as const,
          text: `Cảm ơn quý khách đã quan tâm! Kỹ thuật viên vựa đã nhận tin "${userMsg}" và sẽ liên hệ ngay qua số điện thoại hỗ trợ đóng gói tươi sống.`,
          time: "Vừa xong",
        },
      ]);
    }, 800);
  };

  return (
    <>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        {/* Left: Vendor Profile */}
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0F3860] text-white shadow-sm">
            <Anchor className="h-7 w-7" />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                {vendor.name}
              </h3>
              <span className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                <ShieldCheck className="h-3 w-3 text-emerald-600" />
                Đối tác vựa chuẩn xanh
              </span>
            </div>

            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span>{vendor.address}</span>
            </p>
          </div>
        </div>

        {/* Middle: Vendor Key Metrics */}
        <div className="flex items-center gap-6 border-y md:border-y-0 md:border-x border-slate-100 py-3 md:py-0 md:px-6 w-full md:w-auto justify-around">
          <div className="text-center">
            <div className="text-base font-black text-slate-900">
              {vendor.positiveRatingPercent}%
            </div>
            <div className="text-[11px] text-slate-400">Tỷ lệ hài lòng vựa</div>
          </div>

          <div className="text-center">
            <div className="text-base font-black text-slate-900">
              ~{vendor.responseTimeMinutes} Phút
            </div>
            <div className="text-[11px] text-slate-400">Chuẩn bị hàng</div>
          </div>

          <div className="text-center">
            <div className="text-base font-black text-[#0F3860]">
              {vendor.ratingAverage} / 5.0
            </div>
            <div className="text-[11px] text-slate-400">Đánh giá vựa</div>
          </div>
        </div>

        {/* Right: Vendor Actions */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <Link
            href={`/vendor/${vendor.slug}`}
            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 rounded-xl border border-[#0F3860] px-4 py-2.5 text-xs font-bold text-[#0F3860] transition hover:bg-sky-50 active:scale-95"
          >
            <Store className="h-3.5 w-3.5" />
            <span>Xem Gian Hàng</span>
          </Link>

          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 rounded-xl bg-[#0F3860] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#0A2744] active:scale-95"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Nhắn Tin Vựa</span>
          </button>
        </div>
      </div>

      {/* Interactive Vendor Chat Modal */}
      {chatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="relative flex h-[500px] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between bg-[#0F3860] px-4 py-3 text-white">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                  <Anchor className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold">{vendor.name}</h4>
                  <span className="flex items-center gap-1 text-[10px] text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Đang hoạt động trực hồ
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                className="rounded-lg p-1 text-slate-300 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 space-y-3 overflow-y-auto p-4 bg-slate-50">
              {chatHistory.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${
                    item.sender === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                      item.sender === "user"
                        ? "bg-[#0F3860] text-white rounded-tr-none"
                        : "bg-white text-slate-800 border border-slate-200 shadow-2xs rounded-tl-none"
                    }`}
                  >
                    {item.text}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 px-1">
                    {item.time}
                  </span>
                </div>
              ))}
            </div>

            {/* Quick Suggestions */}
            <div className="flex items-center gap-1.5 overflow-x-auto border-t border-slate-100 bg-white px-3 py-2 text-[11px] text-slate-600 whitespace-nowrap">
              <button
                type="button"
                onClick={() => setMessage("Vựa còn tôm sống size 15-20 con/kg không ạ?")}
                className="rounded-full bg-slate-100 px-2.5 py-1 hover:bg-slate-200"
              >
                Còn tôm không?
              </button>
              <button
                type="button"
                onClick={() => setMessage("Giao Quận 1 bao lâu có ạ?")}
                className="rounded-full bg-slate-100 px-2.5 py-1 hover:bg-slate-200"
              >
                Thời gian giao hàng?
              </button>
            </div>

            {/* Chat Input */}
            <form
              onSubmit={handleSendMessage}
              className="flex items-center gap-2 border-t border-slate-200 bg-white p-3"
            >
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Nhập tin nhắn cho vựa..."
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-[#0F3860] focus:bg-white"
              />
              <button
                type="submit"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F3860] text-white transition hover:bg-[#0A2744] active:scale-95"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
