"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Star,
  Truck,
  Flame,
  ShoppingCart,
  Radio,
  Sparkles,
} from "lucide-react";
import { useScrollProgress } from "@/hooks/useScrollProgress";

interface HeroSlide {
  id: number;
  badge: string;
  title: string;
  titleHighlight: string;
  description: string;
  primaryBtnText: string;
  primaryBtnHref: string;
  secondaryBtnText: string;
  secondaryBtnHref: string;
  bgImage: string;
  featuredProduct: {
    tag: string;
    name: string;
    origin: string;
    price: string;
    originalPrice: string;
    unit: string;
    image: string;
    status: string;
    orderCount: number;
  };
}

const slides: HeroSlide[] = [
  {
    id: 1,
    badge: "SÀN THƯƠNG MẠI HẢI SẢN TƯƠI SỐNG HÀNG ĐẦU",
    title: "Hải Sản Tươi Ngon,",
    titleHighlight: "Chọn Chuẩn Vị Biển",
    description:
      "Kết nối trực tiếp hơn 100 vựa hải sản uy tín khắp Việt Nam. Đầy đủ tôm, cua, cá, mực tươi sống bơi hồ, so sánh giá minh bạch và giao sống tận nhà trong 2 giờ.",
    primaryBtnText: "KHÁM PHÁ NGAY",
    primaryBtnHref: "#featured-seafood",
    secondaryBtnText: "TÌM VỰA GẦN BẠN",
    secondaryBtnHref: "#trusted-vendors",
    bgImage:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2400&q=90",
    featuredProduct: {
      tag: "⚡ BÁN CHẠY NHẤT",
      name: "Tôm Sú Biển Phú Quốc (Size 15 - 20 con/kg)",
      origin: "Vựa Thủy Sản Phú Quốc Oanh",
      price: "420.000 đ",
      originalPrice: "520.000 đ",
      unit: "kg",
      image:
        "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=800&q=80",
      status: "🟢 100% Đang bơi tại hồ oxy",
      orderCount: 42,
    },
  },
  {
    id: 2,
    badge: "CAM KẾT CHẮC THỊT — BAO GẠCH 1 ĐỔI 1",
    title: "Cua Cà Mau & Ghẹ Xanh,",
    titleHighlight: "Đặc Sản Tiến Vua",
    description:
      "Tuyển chọn kỹ càng từng con từ vựa Cà Mau Năm Căn và ghẹ lưới Phan Thiết. Dây trói siêu nhẹ không trọng lượng, bao ăn bao đổi tận tay trong ngày.",
    primaryBtnText: "ĐẶT CUA & GHẸ SỐNG",
    primaryBtnHref: "#featured-seafood",
    secondaryBtnText: "XEM GIAN HÀNG VỰA",
    secondaryBtnHref: "#trusted-vendors",
    bgImage:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2400&q=90",
    featuredProduct: {
      tag: "🔥 CUA GẠCH NĂM CĂN",
      name: "Cua Biển Cà Mau Gạch Son (400g - 600g/con)",
      origin: "Vựa Cua Biển Cà Mau Chính Hiệu",
      price: "550.000 đ",
      originalPrice: "680.000 đ",
      unit: "kg",
      image:
        "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?auto=format&fit=crop&w=800&q=80",
      status: "🟢 Cua sống khỏe, gạch son đầy mai",
      orderCount: 68,
    },
  },
  {
    id: 3,
    badge: "ĐÁNH BẮT TỰ NHIÊN — CẬP BẾN RẠNG SÁNG",
    title: "Cá Hồi Sashimi & Mực Ống,",
    titleHighlight: "Chuẩn Vị Tươi Ngọt",
    description:
      "Mực ống câu đêm Côn Đảo và cá hồi Na Uy thượng hạng phi lê bảo quản lạnh chuyên nghiệp. Giữ trọn vẹn vị ngọt thanh tự nhiên và giá trị dinh dưỡng cao nhất.",
    primaryBtnText: "XEM HẢI SẢN CAO CẤP",
    primaryBtnHref: "#featured-seafood",
    secondaryBtnText: "CHÍNH SÁCH ĐÓNG GÓI",
    secondaryBtnHref: "#trusted-vendors",
    bgImage:
      "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?auto=format&fit=crop&w=2400&q=90",
    featuredProduct: {
      tag: "✨ CHUẨN ĂN SỐNG SASHIMI",
      name: "Cá Hồi Na Uy Phi Lê Tươi (Sashimi Grade)",
      origin: "Hải Sản Nhập Khẩu Sài Gòn Ocean",
      price: "385.000 đ",
      originalPrice: "460.000 đ",
      unit: "500g",
      image:
        "https://images.unsplash.com/photo-1534482421-64566f976cfa?auto=format&fit=crop&w=800&q=80",
      status: "🟢 Filet đóng khay chân không lạnh",
      orderCount: 35,
    },
  },
];

const liveOrders = [
  "Khách hàng tại Q.1 vừa đặt 3kg Cua Cà Mau (vừa xong)",
  "Khách hàng tại Thủ Đức vừa đặt 2kg Tôm Sú Biển bơi hồ (2 phút trước)",
  "Nhà hàng Hải Đăng vừa đặt 5kg Ghẹ Xanh Phan Thiết (5 phút trước)",
];

export function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [liveOrderIndex, setLiveOrderIndex] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLElement>(null);

  // Auto-play slider every 5.5 seconds
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [isPaused]);

  // Live order ticker rotation
  useEffect(() => {
    const orderTimer = setInterval(() => {
      setLiveOrderIndex((prev) => (prev + 1) % liveOrders.length);
    }, 4000);
    return () => clearInterval(orderTimer);
  }, []);

  // 3D Mouse Parallax Tracker
  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
    setIsPaused(false);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const slide = slides[currentSlide];
  const { scrollY } = useScrollProgress();

  return (
    <section
      ref={heroRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={handleMouseLeave}
      className="relative min-h-[600px] lg:min-h-[660px] overflow-hidden bg-slate-950 py-12 text-white sm:py-16 lg:py-20 flex items-center select-none"
    >
      {/* 1. Clear, Vibrant Background Image Slides with Smooth Fade and Scroll Parallax */}
      {slides.map((s, index) => (
        <div
          key={s.id}
          className={`absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-out ${
            index === currentSlide
              ? "opacity-95 scale-100"
              : "opacity-0 scale-105 pointer-events-none"
          }`}
          style={{
            backgroundImage: `url('${s.bgImage}')`,
            transform: `scale(${index === currentSlide ? 1 + mousePos.y * 0.03 : 1.05}) translate(${mousePos.x * -10}px, ${mousePos.y * -10 + scrollY * 0.22}px)`,
          }}
        />
      ))}

      {/* 2. Soft Ambient Gradient Vignette */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/55 to-slate-950/20" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />

      {/* 3. Floating Ambient Water Bubbles (Micro-animation) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-1">
        <div className="animate-bubble-1 absolute left-[15%] bottom-5 h-4 w-4 rounded-full bg-cyan-300/30 blur-[1px]" />
        <div className="animate-bubble-2 absolute left-[45%] bottom-10 h-6 w-6 rounded-full bg-sky-200/25 blur-[1px]" />
        <div className="animate-bubble-3 absolute right-[25%] bottom-6 h-5 w-5 rounded-full bg-cyan-300/20 blur-[1px]" />
        <div className="animate-bubble-1 absolute right-[10%] bottom-16 h-3 w-3 rounded-full bg-white/30 blur-[1px]" />
      </div>

      {/* 4. Main Content Container */}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full z-10">
        {/* Floating Live Realtime Order Toast */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-slate-900/80 px-4 py-1.5 text-xs text-emerald-300 backdrop-blur-md shadow-lg transition-all duration-500">
          <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
          <span className="font-semibold text-white">Đơn hàng mới:</span>
          <span className="text-emerald-300 transition-opacity duration-300 font-medium">
            {liveOrders[liveOrderIndex]}
          </span>
        </div>

        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-8">
          {/* Left Column: Headlines & CTA with Stagger Entrance Animation */}
          <div key={currentSlide} className="lg:col-span-6 xl:col-span-7">
            {/* Small live badge with pulsating dot */}
            <div className="animate-slide-up inline-flex items-center gap-2 rounded-full border border-white/25 bg-slate-900/70 px-4 py-1.5 text-xs font-bold text-cyan-300 backdrop-blur-md shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
              <span>{slide.badge}</span>
            </div>

            {/* Big, bold headline */}
            <h1 className="animate-slide-up-delay-1 mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl lg:leading-[1.12] drop-shadow-md">
              {slide.title}
              <br />
              <span className="text-cyan-300 drop-shadow-lg">
                {slide.titleHighlight}
              </span>
            </h1>

            {/* Description */}
            <p className="animate-slide-up-delay-2 mt-4 max-w-xl text-sm leading-relaxed text-slate-100 sm:text-base sm:leading-7 drop-shadow-sm font-normal">
              {slide.description}
            </p>

            {/* Vibrant Pill CTA button with Shimmer and Hover Glow */}
            <div className="animate-slide-up-delay-2 mt-8 flex flex-wrap items-center gap-4">
              <Link
                href={slide.primaryBtnHref}
                className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-full bg-[#EA580C] px-8 py-4 text-sm font-black uppercase tracking-wider text-white shadow-xl shadow-orange-600/40 transition-all duration-300 hover:bg-[#C2410C] hover:scale-105 hover:shadow-orange-500/60 active:scale-95 animate-pulse-glow"
              >
                <div className="animate-shimmer absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                <span className="relative z-10">{slide.primaryBtnText}</span>
                <ArrowRight className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>

              <Link
                href={slide.secondaryBtnHref}
                className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-7 py-4 text-sm font-bold text-white backdrop-blur-md transition-all duration-300 hover:bg-white/20 hover:border-white/70 hover:scale-102"
              >
                <span>{slide.secondaryBtnText}</span>
              </Link>
            </div>

            {/* Trust points inline */}
            <div className="animate-slide-up-delay-2 mt-9 flex flex-wrap items-center gap-6 text-xs text-slate-200 border-t border-white/20 pt-5">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs">
                  ✓
                </span>
                <span>Giao sống bơi hồ trong 2H</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs">
                  ✓
                </span>
                <span>Đóng thùng sục oxy chuyên dụng</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs">
                  ✓
                </span>
                <span>100% Bao ăn 1 đổi 1</span>
              </div>
            </div>
          </div>

          {/* Right Column: Creative 3D Layered Deck with Real-Time Mouse Parallax & Scroll Depth */}
          <div className="lg:col-span-6 xl:col-span-5 flex justify-center lg:justify-end">
            <div
              className="relative w-full max-w-[380px] sm:max-w-[420px] transition-transform duration-300 ease-out"
              style={{
                perspective: "1200px",
                transformStyle: "preserve-3d",
                transform: `rotateY(${mousePos.x * 20}deg) rotateX(${-mousePos.y * 16 + Math.min(scrollY * 0.03, 10)}deg) translateZ(${Math.max(-scrollY * 0.08, -30)}px)`,
              }}
            >
              {/* Rotating Luminous Ocean Aura Glow behind cards */}
              <div className="animate-spin-slow absolute -inset-8 rounded-full bg-gradient-to-tr from-cyan-500/20 via-sky-400/10 to-orange-500/15 blur-3xl pointer-events-none" />

              {/* Floating Dynamic Badge 1 (Top-Right): Fast 2h Delivery with Parallax Depth */}
              <div
                className="animate-float absolute -top-6 -right-3 z-30 flex items-center gap-2.5 rounded-2xl border border-white/30 bg-slate-900/90 px-4 py-2.5 shadow-2xl backdrop-blur-md text-white transition-transform hover:scale-105"
                style={{
                  transform: `translateZ(60px) translate(${mousePos.x * 15}px, ${mousePos.y * 15}px)`,
                }}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/25 text-orange-400 shadow-xs">
                  <Truck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] font-bold">Giao Hỏa Tốc 2H</p>
                  <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Đang giao 18 đơn nội thành
                  </p>
                </div>
              </div>

              {/* Floating Dynamic Badge 2 (Bottom-Left): Verified Rating with Parallax Depth */}
              <div
                className="animate-float-reverse absolute -bottom-5 -left-3 z-30 flex items-center gap-2.5 rounded-2xl border border-white/30 bg-slate-900/90 px-4 py-2.5 shadow-2xl backdrop-blur-md text-white transition-transform hover:scale-105"
                style={{
                  transform: `translateZ(50px) translate(${mousePos.x * -12}px, ${mousePos.y * -12}px)`,
                }}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/25 text-amber-400 shadow-xs">
                  <Star className="h-4 w-4 fill-amber-400" />
                </div>
                <div>
                  <p className="text-[11px] font-bold">4.9/5 Đánh Giá</p>
                  <p className="text-[10px] text-slate-300">
                    Từ hơn 2.400+ khách hàng hài lòng
                  </p>
                </div>
              </div>

              {/* 3D Stack of Cards: Layered Deck */}
              <div className="relative h-[370px] w-full" style={{ transformStyle: "preserve-3d" }}>
                {slides.map((s, idx) => {
                  const isActive = idx === currentSlide;
                  const isNext = idx === (currentSlide + 1) % slides.length;
                  const isPrev = idx === (currentSlide - 1 + slides.length) % slides.length;

                  let cardStyle: React.CSSProperties = {
                    transition: "all 0.7s cubic-bezier(0.34, 1.4, 0.64, 1)",
                  };

                  if (isActive) {
                    cardStyle = {
                      ...cardStyle,
                      transform: `translate3d(0px, 0px, 30px) scale(1)`,
                      zIndex: 20,
                      opacity: 1,
                    };
                  } else if (isNext) {
                    cardStyle = {
                      ...cardStyle,
                      transform: `translate3d(55px, 20px, -40px) rotateY(-18deg) scale(0.88)`,
                      zIndex: 10,
                      opacity: 0.5,
                      filter: "blur(0.5px)",
                    };
                  } else if (isPrev) {
                    cardStyle = {
                      ...cardStyle,
                      transform: `translate3d(-55px, 20px, -40px) rotateY(18deg) scale(0.88)`,
                      zIndex: 10,
                      opacity: 0.5,
                      filter: "blur(0.5px)",
                    };
                  } else {
                    cardStyle = {
                      ...cardStyle,
                      transform: `translate3d(0px, 30px, -80px) scale(0.8)`,
                      zIndex: 5,
                      opacity: 0,
                    };
                  }

                  return (
                    <div
                      key={s.id}
                      onClick={() => !isActive && setCurrentSlide(idx)}
                      style={cardStyle}
                      className={`absolute inset-0 cursor-pointer rounded-3xl border border-white/25 bg-white/10 p-3 shadow-2xl backdrop-blur-xl ${
                        isActive
                          ? "hover:border-cyan-400/50 hover:shadow-cyan-500/20"
                          : "hover:opacity-80"
                      }`}
                    >
                      <div className="relative h-full w-full overflow-hidden rounded-2xl bg-slate-900">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={s.featuredProduct.image}
                          alt={s.featuredProduct.name}
                          className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                        />

                        {/* Gradient Shadow */}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/30 to-transparent" />

                        {/* Top Tag */}
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-orange-600/95 px-3 py-1 text-[11px] font-extrabold text-white shadow-lg">
                          <Flame className="h-3.5 w-3.5 fill-white animate-bounce" />
                          <span>{s.featuredProduct.tag}</span>
                        </div>

                        {/* Live order counter pill on top right */}
                        <div className="absolute top-3 right-3 rounded-full bg-slate-900/80 px-2.5 py-1 text-[10px] font-bold text-emerald-300 backdrop-blur-md border border-emerald-500/30">
                          Đã bán {s.featuredProduct.orderCount}kg hôm nay
                        </div>

                        {/* Product Info at bottom of card */}
                        <div className="absolute bottom-3 left-3 right-3 p-1 text-white">
                          <p className="text-[11px] font-medium text-cyan-300">
                            {s.featuredProduct.origin}
                          </p>
                          <h3 className="mt-0.5 text-sm font-extrabold line-clamp-1">
                            {s.featuredProduct.name}
                          </h3>

                          <div className="mt-2 flex items-center justify-between border-t border-white/15 pt-2">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-xl font-black text-white">
                                {s.featuredProduct.price}
                              </span>
                              <span className="text-[11px] text-slate-300 line-through">
                                {s.featuredProduct.originalPrice}
                              </span>
                              <span className="text-[10px] text-slate-300">
                                / {s.featuredProduct.unit}
                              </span>
                            </div>

                            <Link
                              href="#featured-seafood"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-[#EA580C] px-3.5 py-1.5 text-xs font-bold text-white shadow-md transition-all hover:bg-[#C2410C] hover:scale-105 active:scale-95"
                            >
                              <ShoppingCart className="h-3.5 w-3.5" />
                              <span>Mua ngay</span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 3 Interactive Quick Selector Dots for the 3D Cards */}
              <div className="mt-5 flex items-center justify-center gap-3">
                {slides.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setCurrentSlide(idx)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold transition-all duration-300 ${
                      idx === currentSlide
                        ? "bg-cyan-400 text-slate-950 scale-105 shadow-md shadow-cyan-400/40"
                        : "border border-white/20 bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white"
                    }`}
                  >
                    <span>{idx === 0 ? "🦐 Tôm Sú" : idx === 1 ? "🦀 Cua Cà Mau" : "🐟 Cá Hồi"}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Left & Right Navigation Arrows */}
      <button
        type="button"
        onClick={prevSlide}
        aria-label="Slide trước"
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-slate-950/60 text-white backdrop-blur-md transition-all hover:bg-white hover:text-slate-900 hover:scale-110 active:scale-95 shadow-xl"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      <button
        type="button"
        onClick={nextSlide}
        aria-label="Slide sau"
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-slate-950/60 text-white backdrop-blur-md transition-all hover:bg-white hover:text-slate-900 hover:scale-110 active:scale-95 shadow-xl"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* 6. Seamless Flowing Ocean Wave at bottom linking to next section */}
      <div className="absolute -bottom-1 inset-x-0 w-[200%] pointer-events-none z-20 overflow-hidden leading-none animate-wave-flow opacity-90">
        <svg
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          className="relative block w-full h-10 text-white fill-current"
        >
          <path d="M0,0 C150,90 350,-40 500,40 C650,120 900,20 1200,60 L1200,120 L0,120 Z"></path>
        </svg>
      </div>

      {/* 7. Pagination Dots at the bottom */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
        {slides.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setCurrentSlide(idx)}
            aria-label={`Chuyển tới slide ${idx + 1}`}
            className={`transition-all duration-300 ${
              idx === currentSlide
                ? "h-2 w-8 rounded-full bg-[#EA580C] shadow-md shadow-orange-500/50"
                : "h-2 w-2 rounded-full bg-white/40 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
