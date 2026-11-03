"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { BackgroundVideo } from "@/components/ui/BackgroundVideo";

interface HeroSlide {
  tab: string;
  eyebrow: string;
  title: string;
  description: string;
  cta: { label: string; href: string };
  image: string;
  product: { name: string; origin: string; href: string };
}

const SLIDES: HeroSlide[] = [
  {
    tab: "Tôm sú",
    eyebrow: "Chợ hải sản trực tuyến",
    title: "Hải sản tươi từ vựa, giao tận bếp nhà bạn",
    description:
      "Mua trực tiếp từ các vựa uy tín khắp Việt Nam. So sánh giá minh bạch, đóng thùng oxy giữ sống và giao trong 2 giờ tại TP.HCM.",
    cta: { label: "Mua hải sản ngay", href: "/products" },
    image:
      "https://images.unsplash.com/photo-1559737558-2f5a35f4523b?auto=format&fit=crop&w=1200&q=80",
    product: {
      name: "Tôm sú biển tươi sống loại 1",
      origin: "Vựa Thủy Sản Phú Quốc Xanh",
      href: "/products/tom-su-bien-tuoi-song-loai-1",
    },
  },
  {
    tab: "Cua Cà Mau",
    eyebrow: "Đặc sản Năm Căn",
    title: "Cua gạch son Cà Mau, chắc thịt đầy gạch",
    description:
      "Tuyển từng con từ vựa Năm Căn, dây trói nhẹ, cân đúng trọng lượng thịt. Cua không đạt chất lượng được đổi mới trong ngày.",
    cta: { label: "Xem cua & ghẹ", href: "/categories/cua-ghe" },
    image:
      "https://images.unsplash.com/photo-1553659971-f01207815844?auto=format&fit=crop&w=1200&q=80",
    product: {
      name: "Cua gạch son Cà Mau loại 1",
      origin: "HTX Cua Cà Mau Đất Mũi",
      href: "/products/cua-gach-son-ca-mau-loai-1",
    },
  },
  {
    tab: "Cá hồi",
    eyebrow: "Chuẩn ăn sống",
    title: "Cá hồi phi lê tươi, cắt và giao trong ngày",
    description:
      "Phi lê đóng khay, bảo quản lạnh liên tục từ kho tới tay bạn. Phù hợp sashimi, áp chảo hay nướng.",
    cta: { label: "Xem cá tươi", href: "/categories/ca-bien-tuoi" },
    image:
      "https://images.unsplash.com/photo-1601314002592-b8734bca6604?auto=format&fit=crop&w=1200&q=80",
    product: {
      name: "Cá hồi phi lê nhập khẩu",
      origin: "Vựa Hải Sản Nha Trang Xanh",
      href: "/products/ca-hoi-phi-le-nhap-khau",
    },
  },
];

const TRUST_POINTS = [
  "Giao trong 2 giờ",
  "Đóng thùng sục oxy",
  "1 đổi 1 nếu không đạt",
];
const AUTOPLAY_MS = 6500;

export function HeroSection() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    const timer = setTimeout(
      () => setCurrent((index) => (index + 1) % SLIDES.length),
      AUTOPLAY_MS,
    );
    return () => clearTimeout(timer);
  }, [current, paused]);

  const slide = SLIDES[current]!;

  return (
    <section
      className="relative overflow-hidden bg-[#0B2540] text-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Night fish market footage behind the copy, kept dark so text stays readable. */}
      <BackgroundVideo
        src="/videos/hero-fish-market.mp4"
        poster="/videos/hero-fish-market-poster.jpg"
        className="absolute inset-0 h-full w-full opacity-80"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-linear-to-r from-[#0B2540]/95 via-[#0B2540]/65 to-[#0B2540]/25"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-[#0B2540] to-transparent"
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:px-8 lg:py-24">
        {/* Keyed by slide so each line rises in again, one after another. */}
        <div key={current}>
          <p className="animate-rise text-sm font-medium text-sky-300">
            {slide.eyebrow}
          </p>
          <h1
            className="animate-rise mt-3 max-w-xl text-4xl leading-[1.15] font-bold tracking-tight text-balance sm:text-5xl"
            style={{ animationDelay: "80ms" }}
          >
            {slide.title}
          </h1>
          <p
            className="animate-rise mt-5 max-w-lg text-base leading-relaxed text-slate-300"
            style={{ animationDelay: "160ms" }}
          >
            {slide.description}
          </p>

          <div
            className="animate-rise mt-8 flex flex-wrap items-center gap-x-6 gap-y-4"
            style={{ animationDelay: "240ms" }}
          >
            <Link
              href={slide.cta.href}
              className="group inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-[#0B2540] shadow-sm transition-all hover:-translate-y-0.5 hover:bg-sky-50 hover:shadow-lg hover:shadow-black/20"
            >
              {slide.cta.label}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/#trusted-vendors"
              className="text-sm font-semibold text-white underline-offset-4 hover:underline"
            >
              Xem các vựa đối tác
            </Link>
          </div>

          <ul
            className="animate-rise mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-6 text-sm text-slate-300"
            style={{ animationDelay: "320ms" }}
          >
            {TRUST_POINTS.map((point) => (
              <li key={point} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="relative aspect-4/3 overflow-hidden rounded-2xl bg-slate-800 shadow-2xl shadow-black/40 ring-1 ring-white/10">
            {SLIDES.map((s, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={s.image}
                src={s.image}
                alt={s.product.name}
                fetchPriority={index === 0 ? "high" : "low"}
                // The visible photo slowly zooms out (Ken Burns) while it is shown.
                className={`motion-zoom absolute inset-0 h-full w-full object-cover ${
                  index === current ? "opacity-100" : "opacity-0"
                }`}
                style={{
                  transform: index === current ? "scale(1)" : "scale(1.08)",
                  transition: `opacity 900ms ease, transform ${index === current ? AUTOPLAY_MS + 1500 : 0}ms ease-out`,
                }}
              />
            ))}
            <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/75 to-transparent p-5 pt-16">
              <div
                key={current}
                className="animate-rise"
                style={{ animationDelay: "250ms" }}
              >
                <p className="text-xs text-slate-300">{slide.product.origin}</p>
                <Link
                  href={slide.product.href}
                  className="mt-1 inline-flex items-center gap-1.5 text-lg font-semibold text-white hover:underline"
                >
                  {slide.product.name}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          <div
            role="tablist"
            aria-label="Sản phẩm nổi bật"
            className="mt-4 grid grid-cols-3 gap-2"
          >
            {SLIDES.map((s, index) => (
              <button
                key={s.tab}
                type="button"
                role="tab"
                aria-selected={index === current}
                onClick={() => setCurrent(index)}
                className="group text-left"
              >
                <span className="block h-0.5 overflow-hidden rounded-full bg-white/15">
                  <span
                    className={`block h-full bg-white transition-[width] ease-linear ${
                      index === current
                        ? paused
                          ? "w-full duration-0"
                          : "w-full"
                        : "w-0 duration-0"
                    }`}
                    style={
                      index === current && !paused
                        ? { transitionDuration: `${AUTOPLAY_MS}ms` }
                        : undefined
                    }
                  />
                </span>
                <span
                  className={`mt-2 block text-sm transition-colors ${
                    index === current
                      ? "font-semibold text-white"
                      : "text-slate-400 group-hover:text-slate-200"
                  }`}
                >
                  {s.tab}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
