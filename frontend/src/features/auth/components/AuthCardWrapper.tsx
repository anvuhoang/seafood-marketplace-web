"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, Phone } from "lucide-react";

interface AuthCardWrapperProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export function AuthCardWrapper({
  title,
  subtitle,
  children,
}: AuthCardWrapperProps) {
  return (
    <div className="relative min-h-screen w-full bg-gradient-to-b from-[#F0F7FF] via-[#F8FAFC] to-[#EDF5FD] flex flex-col justify-between items-center py-8 px-4 sm:px-6">
      {/* Ambient background decoration */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-96 w-full max-w-4xl bg-gradient-to-b from-sky-200/30 to-transparent blur-3xl" />

      {/* Top spacer or quick back link */}
      <div className="w-full max-w-md flex justify-between items-center text-xs text-slate-500 mb-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1 font-semibold text-[#0F3860] hover:text-[#E63946] transition-colors"
        >
          <span>← Quay lại trang chủ</span>
        </Link>
      </div>

      {/* Main Auth Card */}
      <div className="relative z-10 w-full max-w-[460px] rounded-[32px] border border-sky-100/80 bg-white p-7 sm:p-10 shadow-2xl shadow-blue-950/5">
        {/* Logo */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-3xl font-black tracking-tight text-[#0F3860]">
              HaiSan<span className="text-[#E63946]">Express</span>
            </span>
          </Link>

          <h1 className="mt-3 text-lg sm:text-xl font-bold tracking-tight text-slate-900">
            {title}
          </h1>

          <p className="mt-1.5 text-xs leading-relaxed text-slate-500 max-w-xs mx-auto">
            {subtitle}
          </p>
        </div>

        {/* Form Body */}
        <div className="mt-6">{children}</div>

        {/* Security badge at bottom of card */}
        <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-sky-50/70 border border-sky-100/70 px-4 py-2.5 text-xs font-semibold text-slate-600">
          <ShieldCheck className="h-4 w-4 text-[#0F3860] shrink-0" />
          <span>Cam kết an toàn dữ liệu khách hàng</span>
        </div>
      </div>

      {/* Outside Footer Links */}
      <footer className="mt-8 text-center text-xs text-slate-500">
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 font-medium">
          <Link href="/help/terms" className="hover:text-slate-800 transition-colors">
            Điều khoản dịch vụ
          </Link>
          <span className="text-slate-300">•</span>
          <Link href="/help/privacy" className="hover:text-slate-800 transition-colors">
            Chính sách bảo mật
          </Link>
          <span className="text-slate-300">•</span>
          <a
            href="tel:19006886"
            className="inline-flex items-center gap-1 hover:text-[#0F3860] transition-colors"
          >
            <Phone className="h-3.5 w-3.5 text-slate-400" />
            <span>1900 6886</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
