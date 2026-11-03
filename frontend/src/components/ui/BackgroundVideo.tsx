"use client";

import { useEffect, useRef } from "react";

interface BackgroundVideoProps {
  src: string;
  poster: string;
  className?: string;
}

/**
 * Muted, looping decorative video. It only plays while on screen, and people
 * who ask for reduced motion see the poster frame instead.
 */
export function BackgroundVideo({ src, poster, className = "" }: BackgroundVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.pause();
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        // Autoplay can still be refused (e.g. battery saver); the poster stays then.
        video.play().catch(() => undefined);
      } else {
        video.pause();
      }
    });
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden
      tabIndex={-1}
      className={`pointer-events-none object-cover ${className}`}
    />
  );
}
