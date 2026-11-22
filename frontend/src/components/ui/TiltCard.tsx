"use client";

import React, { useCallback, useEffect, useRef } from "react";

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
  scale?: number;
  glare?: boolean;
  perspective?: number;
  onClick?: () => void;
}

const HOVER_TRANSITION = "transform 0.12s ease-out";
const REST_TRANSITION = "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.5s cubic-bezier(0.16, 1, 0.3, 1)";

/**
 * Card that tilts towards the pointer. Styles are written straight to the DOM
 * once per animation frame, so hovering never re-renders React. The effect is
 * skipped on touch screens and for users who prefer reduced motion.
 */
export function TiltCard({
  children,
  className = "",
  maxTilt = 7,
  scale = 1.02,
  glare = true,
  perspective = 1000,
  onClick,
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const enabledRef = useRef(false);

  const restTransform = `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;

  useEffect(() => {
    enabledRef.current =
      window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const applyTilt = useCallback(() => {
    frameRef.current = null;
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = pointerRef.current.x - rect.left;
    const y = pointerRef.current.y - rect.top;
    const rotateX = ((y - rect.height / 2) / (rect.height / 2)) * -maxTilt;
    const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * maxTilt;

    card.style.transform = `perspective(${perspective}px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale})`;

    if (glare && glareRef.current) {
      glareRef.current.style.opacity = "0.16";
      glareRef.current.style.background = `radial-gradient(circle at ${((x / rect.width) * 100).toFixed(1)}% ${((y / rect.height) * 100).toFixed(1)}%, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0) 65%)`;
    }
  }, [glare, maxTilt, perspective, scale]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!enabledRef.current) return;
    pointerRef.current = { x: e.clientX, y: e.clientY };
    if (frameRef.current === null) {
      frameRef.current = requestAnimationFrame(applyTilt);
    }
  };

  const handleMouseEnter = () => {
    if (enabledRef.current && cardRef.current) cardRef.current.style.transition = HOVER_TRANSITION;
  };

  const handleMouseLeave = () => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    if (cardRef.current) {
      cardRef.current.style.transition = REST_TRANSITION;
      cardRef.current.style.transform = restTransform;
    }
    if (glareRef.current) glareRef.current.style.opacity = "0";
  };

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ transform: restTransform, transition: REST_TRANSITION, transformStyle: "preserve-3d" }}
      className={`relative ${className}`}
    >
      {children}
      {glare && (
        <div
          ref={glareRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] transition-opacity duration-300"
          style={{ opacity: 0 }}
        />
      )}
    </div>
  );
}
