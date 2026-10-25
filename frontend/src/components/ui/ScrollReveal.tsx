"use client";

import React, { useEffect, useRef, useState } from "react";

interface ScrollRevealProps {
  children: React.ReactNode;
  animation?: "fade-up-3d" | "fade-left-3d" | "fade-right-3d" | "zoom-3d";
  delay?: number; // ms
  duration?: number; // ms
  threshold?: number;
  className?: string;
  once?: boolean;
}

export function ScrollReveal({
  children,
  animation = "fade-up-3d",
  delay = 0,
  duration = 750,
  threshold = 0.1,
  className = "",
  once = true,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasFinishedTransition, setHasFinishedTransition] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) {
            observer.unobserve(element);
          }
          // After entrance transition completes, clear outer transform lock for 3D tilt freedom
          const timer = setTimeout(() => {
            setHasFinishedTransition(true);
          }, duration + delay + 50);
          return () => clearTimeout(timer);
        } else if (!once) {
          setIsVisible(false);
          setHasFinishedTransition(false);
        }
      },
      {
        threshold,
        rootMargin: "0px 0px -30px 0px",
      }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [delay, duration, once, threshold]);

  const getHiddenTransform = () => {
    switch (animation) {
      case "fade-left-3d":
        return "perspective(1200px) rotateY(-12deg) translateX(-35px) scale(0.96)";
      case "fade-right-3d":
        return "perspective(1200px) rotateY(12deg) translateX(35px) scale(0.96)";
      case "zoom-3d":
        return "perspective(1200px) scale(0.92) translateZ(-40px)";
      case "fade-up-3d":
      default:
        return "perspective(1200px) rotateX(12deg) translateY(40px) scale(0.96)";
    }
  };

  const currentTransform = isVisible
    ? hasFinishedTransition
      ? undefined
      : "perspective(1200px) rotateX(0deg) rotateY(0deg) translate3d(0, 0, 0) scale(1)"
    : getHiddenTransform();

  return (
    <div
      ref={ref}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: currentTransform,
        transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        transformStyle: "preserve-3d",
        willChange:
          isVisible && hasFinishedTransition ? "auto" : "transform, opacity",
      }}
      className={className}
    >
      {children}
    </div>
  );
}
