"use client";

import React from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { SUPPORT_HOTLINE } from "@/lib/constants/contact";

interface AuthCardWrapperProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

const BRAND_POINTS = ["Mua trực tiếp từ vựa, giá minh bạch", "Giao trong 2 giờ tại TP.HCM", "Kiểm hàng trước khi thanh toán"];

function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center">
      <BrandLogo variant={inverted ? "dark" : "light"} className="h-11" />
    </Link>
  );
}

export function AuthCardWrapper({ title, subtitle, children }: AuthCardWrapperProps) {
  return (
    <div className="grid min-h-screen w-full bg-white lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden overflow-hidden bg-[#0B2540] lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1553659971-f01207815844?auto=format&fit=crop&w=1200&q=75"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-linear-to-t from-[#0B2540] via-[#0B2540]/70 to-[#0B2540]/30" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <Logo inverted />
          <div>
            <p className="max-w-md text-3xl leading-tight font-bold tracking-tight text-balance">
              Hải sản tươi từ vựa, giao tận bếp nhà bạn.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-slate-300">
              {BRAND_POINTS.map((point) => (
                <li key={point} className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-emerald-400" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

      <div className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <div className="lg:hidden">
            <Logo />
          </div>
        </div>

        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </main>

        <footer className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-400">
          <Link href="/help/terms" className="hover:text-slate-700">
            Điều khoản dịch vụ
          </Link>
          <Link href="/help/privacy" className="hover:text-slate-700">
            Chính sách bảo mật
          </Link>
          <a href={`tel:${SUPPORT_HOTLINE.tel}`} className="hover:text-slate-700">
            Hỗ trợ {SUPPORT_HOTLINE.display}
          </a>
        </footer>
      </div>
    </div>
  );
}
