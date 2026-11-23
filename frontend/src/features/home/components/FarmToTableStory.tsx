"use client";

import { useEffect, useRef, useState } from "react";

interface Chapter {
  label: string;
  title: string;
  description: string;
  media: { src: string };
}

const CHAPTERS: Chapter[] = [
  {
    label: "Rạng sáng",
    title: "Hàng về khi thuyền vừa cập bến",
    description:
      "Vựa tuyển ngay tại bến những mẻ cá, tôm, cua tươi nhất trong ngày. Không qua nhiều tầng trung gian nên hàng tới tay bạn nhanh hơn và giá minh bạch hơn.",
    media: {
      src: "https://images.unsplash.com/photo-1574781330855-d0db8cc6a79c?auto=format&fit=crop&w=1400&h=1400&q=80",
    },
  },
  {
    label: "Giữ lạnh",
    title: "Ướp đá và đóng thùng oxy ngay tại vựa",
    description:
      "Cá ướp đá vảy giữ độ tươi, tôm cua sống được đóng thùng xốp có sục oxy. Chuỗi lạnh không bị ngắt từ lúc rời vựa.",
    media: {
      src: "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?auto=format&fit=crop&w=1400&h=1400&q=80",
    },
  },
  {
    label: "Tới bếp",
    title: "Có mặt ở bếp nhà bạn trong 2 giờ",
    description:
      "Shipper giao thẳng từ vựa. Bạn được mở thùng kiểm tra trước khi thanh toán, hải sản không đạt được đổi mới.",
    media: {
      src: "https://images.unsplash.com/photo-1625943553852-781c6dd46faa?auto=format&fit=crop&w=1400&h=1400&q=80",
    },
  },
];

/** A chapter's photo. A thin dark wash and vignette give the three photos one look. */
function ChapterMedia({ chapter, className = "" }: { chapter: Chapter; className?: string }) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={chapter.media.src} alt="" loading="lazy" className="h-full w-full object-cover object-[35%_50%]" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[#0B2540]/15 mix-blend-multiply" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(11,37,64,0.45)_100%)]"
      />
    </div>
  );
}

/**
 * "From the boat to your kitchen": on large screens the media frame stays
 * pinned while the chapters scroll past, crossfading to the chapter being read.
 */
export function FarmToTableStory() {
  const [active, setActive] = useState(0);
  const chapterRefs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    // A chapter is "being read" while it crosses the middle band of the viewport.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    chapterRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section className="bg-[#0B2540] py-16 text-white sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-sky-300">Từ vựa đến bếp</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Hải sản đi một quãng ngắn, nên luôn tươi
          </h2>
        </div>

        <div className="mt-12 lg:grid lg:grid-cols-2 lg:gap-16">
          <ol>
            {CHAPTERS.map((chapter, index) => (
              <li
                key={chapter.title}
                ref={(el) => {
                  chapterRefs.current[index] = el;
                }}
                data-index={index}
                className="py-8 lg:flex lg:min-h-[70vh] lg:flex-col lg:justify-center lg:py-0"
              >
                {/* Phones show each chapter's media inline instead of the pinned frame. */}
                <div className="relative mb-6 aspect-4/3 overflow-hidden rounded-2xl bg-slate-800 lg:hidden">
                  <ChapterMedia chapter={chapter} className="absolute inset-0 h-full w-full" />
                </div>

                <div
                  className={`transition-opacity duration-500 ${
                    active === index ? "lg:opacity-100" : "lg:opacity-35"
                  }`}
                >
                  <p className="flex items-center gap-3 text-sm font-medium text-sky-300">
                    <span className="tabular-nums">0{index + 1}</span>
                    <span className="h-px w-8 bg-sky-300/50" />
                    {chapter.label}
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{chapter.title}</h3>
                  <p className="mt-4 max-w-md text-base leading-relaxed text-slate-300">{chapter.description}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="hidden lg:block">
            <div className="sticky top-[calc(50vh-17rem)] aspect-4/5 max-h-[34rem] w-full overflow-hidden rounded-2xl bg-slate-800 shadow-2xl shadow-black/40">
              {CHAPTERS.map((chapter, index) => (
                <div
                  key={chapter.title}
                  aria-hidden={active !== index}
                  className={`motion-zoom absolute inset-0 transition-[opacity,transform] duration-1000 ease-out ${
                    active === index ? "scale-100 opacity-100" : "scale-105 opacity-0"
                  }`}
                >
                  <ChapterMedia chapter={chapter} className="h-full w-full" />
                </div>
              ))}

              <div className="absolute inset-x-0 bottom-0 flex gap-2 bg-linear-to-t from-black/60 to-transparent p-5 pt-12">
                {CHAPTERS.map((chapter, index) => (
                  <span key={chapter.title} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
                    <span
                      className={`block h-full bg-white transition-transform duration-700 ease-out origin-left ${
                        index <= active ? "scale-x-100" : "scale-x-0"
                      }`}
                    />
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
