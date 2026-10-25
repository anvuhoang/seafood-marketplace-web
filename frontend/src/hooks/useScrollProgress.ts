"use client";

import { useState, useEffect } from "react";

export function useScrollProgress() {
  const [scrollY, setScrollY] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY;
          const maxScroll =
            document.documentElement.scrollHeight - window.innerHeight;
          setScrollY(currentY);
          setProgress(
            maxScroll > 0 ? Math.min(Math.max(currentY / maxScroll, 0), 1) : 0
          );
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return { scrollY, progress, isScrolled: scrollY > 80 };
}
