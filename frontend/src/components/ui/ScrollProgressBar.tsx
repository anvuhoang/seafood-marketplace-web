"use client";

import { useScrollProgress } from "@/hooks/useScrollProgress";
import { ArrowUp } from "lucide-react";

export function ScrollProgressBar() {
  const { progress } = useScrollProgress();

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-transparent pointer-events-none"
    >
      <div
        className="h-full bg-gradient-to-r from-sky-400 via-[#0F3860] to-[#E63946] shadow-[0_0_8px_rgba(56,189,248,0.6)] transition-all duration-150 ease-out"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
}

export function ScrollToTopButton() {
  const { scrollY } = useScrollProgress();
  const isVisible = scrollY > 400;

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      title="Cuộn về đầu trang"
      aria-label="Cuộn về đầu trang"
      style={{
        transform: isVisible
          ? "perspective(800px) translateY(0) scale(1) translateZ(20px)"
          : "perspective(800px) translateY(30px) scale(0.7) translateZ(-20px)",
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? "auto" : "none",
        transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-1.5 rounded-full border border-sky-300/40 bg-[#0F3860]/95 px-3.5 py-2.5 text-xs font-bold text-white shadow-2xl backdrop-blur-md hover:bg-[#0A2744] hover:shadow-cyan-500/20 hover:scale-105 active:scale-95"
    >
      <ArrowUp className="h-4 w-4 text-sky-400 animate-bounce" />
      <span className="hidden sm:inline text-[11px]">Đầu trang</span>
    </button>
  );
}
