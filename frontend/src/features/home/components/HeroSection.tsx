import Link from "next/link";
import { ArrowRight, MapPin, ShieldCheck, Star, Check } from "lucide-react";

export function HeroSection() {
  const quickTags = [
    { name: "Tôm sú bơi", href: "#featured-seafood" },
    { name: "Cua Cà Mau", href: "#featured-seafood" },
    { name: "Ghẹ Phan Thiết", href: "#featured-seafood" },
    { name: "Cá hồi Na Uy", href: "#featured-seafood" },
    { name: "Mực Côn Đảo", href: "#featured-seafood" },
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-sky-50/80 via-blue-50/30 to-white py-8 sm:py-12 lg:py-16">
      {/* Subtle organic marine wave accent */}
      <div className="absolute inset-0 -z-10 pointer-events-none opacity-40">
        <svg
          className="h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          viewBox="0 0 1440 320"
        >
          <path
            fill="#0284c7"
            fillOpacity="0.04"
            d="M0,192L48,197.3C96,203,192,213,288,197.3C384,181,480,139,576,133.3C672,128,768,160,864,181.3C960,203,1056,213,1152,197.3C1248,181,1344,139,1392,117.3L1440,96L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"
          />
        </svg>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Left Column: Headlines, Quick tags, CTAs */}
          <div className="lg:col-span-7">
            {/* Live Status Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0F3860] shadow-xs">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Hải sản tươi sống cập bến mỗi sáng</span>
              <span className="hidden text-slate-300 sm:inline">|</span>
              <span className="hidden text-slate-500 font-normal sm:inline">
                100% bơi hồ hoặc ướp đá
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl lg:text-5xl lg:leading-[1.16]">
              Hải sản tươi ngon,
              <br />
              <span className="text-[#0F3860]">chọn mua thật dễ.</span>
            </h1>

            {/* Description */}
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base sm:leading-7">
              Chúng tôi kết nối trực tiếp nguồn hải sản tươi ngon từ các vựa uy
              tín khắp cả nước. Đầy đủ các loại hải sản tươi sống, so sánh giá
              minh bạch và đặt mua thật dễ dàng.
            </p>

            {/* Quick search suggestion tags */}
            <div className="mt-5 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="font-semibold text-slate-400">Gợi ý tìm nhanh:</span>
              {quickTags.map((tag, idx) => (
                <Link
                  key={idx}
                  href={tag.href}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-700 transition hover:border-[#0F3860] hover:text-[#0F3860] shadow-2xs"
                >
                  {tag.name}
                </Link>
              ))}
            </div>

            {/* Call to Actions */}
            <div className="mt-7 flex flex-wrap items-center gap-3.5">
              <Link
                href="#featured-seafood"
                className="inline-flex items-center gap-2 rounded-xl bg-[#E63946] px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-red-600/20 transition-all hover:bg-[#D62839] hover:shadow-lg active:scale-98"
              >
                <span>Khám phá hải sản ngay</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="#trusted-vendors"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 shadow-xs transition hover:border-[#0F3860] hover:text-[#0F3860]"
              >
                <MapPin className="h-4 w-4 text-[#0F3860]" />
                <span>Tìm vựa hải sản gần bạn</span>
              </Link>
            </div>

            {/* Trust checklist - clean and human, not 3 colorful boxes */}
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-200/80 pt-5 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-slate-800">
                  100+ Vựa uy tín liên kết
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-slate-800">
                  Đóng thùng oxy chuyên dụng
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-slate-800">
                  Giao nhanh trong ngày
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Natural Light Seafood Platter with Store Badge */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto max-w-lg lg:max-w-none">
              {/* Main Card with Soft Shadow */}
              <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-2.5 shadow-xl shadow-slate-200/60">
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100 sm:aspect-[16/11]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.unsplash.com/photo-1534482421-64566f976cfa?auto=format&fit=crop&w=1200&q=85"
                    alt="Khay hải sản tươi sống tự nhiên"
                    className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                  />

                  {/* Gradient shadow at bottom of image for the store pill */}
                  <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

                  {/* Rating Badge top-left */}
                  <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-slate-800 shadow-sm backdrop-blur-xs">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span>4.9/5</span>
                    <span className="font-normal text-slate-500">
                      · 2.4k+ đánh giá
                    </span>
                  </div>

                  {/* Bottom Store Banner */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl bg-slate-900/90 p-3 text-white backdrop-blur-md">
                    <div>
                      <p className="text-xs font-bold text-white">
                        Vựa hải sản Đầm Sen — Giao hỏa tốc 2h
                      </p>
                      <p className="text-[11px] text-slate-300">
                        Cá hồi, tôm sú, cua gạch tươi sống bơi hồ
                      </p>
                    </div>

                    <Link
                      href="#featured-seafood"
                      className="shrink-0 rounded-lg bg-[#E63946] px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-[#D62839]"
                    >
                      Đặt ngay
                    </Link>
                  </div>
                </div>

                {/* Sub-bar below image */}
                <div className="flex items-center justify-between px-3 py-2.5 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span>Cam kết tươi sống hoặc hoàn tiền 100%</span>
                  </div>
                  <span className="font-bold text-[#0F3860]">
                    Freeship từ 500k
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
