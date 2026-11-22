"use client";

import React, { useEffect, useRef, useState } from "react";

type RevealAnimation = "fade-up" | "fade-in" | "zoom";
/** Older names are still accepted and map to the subtle equivalents. */
type LegacyAnimation = "fade-up-3d" | "fade-left-3d" | "fade-right-3d" | "zoom-3d";

interface ScrollRevealProps {
  children: React.ReactNode;
  animation?: RevealAnimation | LegacyAnimation;
  delay?: number; // ms
  duration?: number; // ms
  threshold?: number;
  className?: string;
  as?: "div" | "li" | "section";
}

const HIDDEN_TRANSFORM: Record<RevealAnimation, string> = {
  "fade-up": "translate3d(0, 16px, 0)",
  "fade-in": "none",
  zoom: "scale(0.97)",
};

function normalize(animation: RevealAnimation | LegacyAnimation): RevealAnimation {
  if (animation === "zoom-3d") return "zoom";
  if (animation.endsWith("-3d")) return "fade-up";
  return animation as RevealAnimation;
}

/**
 * Fades content in the first time it scrolls into view. Only opacity and
 * transform animate, and people who ask for reduced motion see it at once.
 */
export function ScrollReveal({
  children,
  animation = "fade-up",
  delay = 0,
  duration = 700,
  threshold = 0.15,
  className = "",
  as: Tag = "div",
}: ScrollRevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting || reduceMotion) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold]);

  const kind = normalize(animation);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      data-visible={visible}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : HIDDEN_TRANSFORM[kind],
        transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
      }}
      className={className}
    >
      {children}
    </Tag>
  );
}
