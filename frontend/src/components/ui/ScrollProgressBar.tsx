"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";

/**
 * Thin reading-progress bar. The bar is scaled straight in the DOM once per
 * frame, which only touches compositing and never re-renders React.
 */
export function ScrollProgressBar() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame: number | null = null;

    const update = () => {
      frame = null;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = maxScroll > 0 ? Math.min(Math.max(window.scrollY / maxScroll, 0), 1) : 0;
      if (barRef.current) barRef.current.style.transform = `scaleX(${progress})`;
    };
    const onScroll = () => {
      if (frame === null) frame = requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div aria-hidden="true" className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-transparent pointer-events-none">
      <div
        ref={barRef}
        className="h-full origin-left bg-linear-to-r from-sky-400 via-[#0F3860] to-[#E63946] shadow-[0_0_8px_rgba(56,189,248,0.6)]"
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  );
}

const SHOW_AFTER_PX = 400;

export function ScrollToTopButton() {
  // Only re-renders when the button crosses the visibility threshold.
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsVisible(window.scrollY > SHOW_AFTER_PX);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
