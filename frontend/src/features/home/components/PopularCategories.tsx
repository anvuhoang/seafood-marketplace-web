import Link from "next/link";
import { homeCategories } from "../data/home.mock";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TiltCard } from "@/components/ui/TiltCard";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

export function PopularCategories() {
  return (
    <section className="bg-white py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal animation="fade-up-3d">
          <SectionHeading
            title="Danh mục phổ biến"
            description="Chọn loại hải sản tươi sống bạn yêu thích cho bữa cơm gia đình"
            actionHref="#featured-seafood"
            actionLabel="Xem tất cả danh mục"
          />
        </ScrollReveal>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 sm:gap-5">
          {homeCategories.map((category, idx) => (
            <ScrollReveal
              key={category.id}
              animation="fade-up-3d"
              delay={idx * 60}
              className="h-full"
            >
              <TiltCard
                maxTilt={8}
                scale={1.03}
                className="rounded-2xl h-full"
              >
                <Link
                  href="#featured-seafood"
                  className="group flex h-full flex-col items-center rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-xs transition-all duration-300 hover:border-sky-300 hover:shadow-xl hover:shadow-blue-900/10 preserve-3d"
                >
                  {/* Category Image with circular crop and 3D depth pop */}
                  <div
                    style={{ transform: "translateZ(24px)" }}
                    className="relative mb-3.5 h-20 w-20 overflow-hidden rounded-full border-2 border-slate-100 bg-slate-50 shadow-sm transition-all duration-300 group-hover:border-[#0F3860] group-hover:shadow-md sm:h-24 sm:w-24"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={category.image}
                      alt={category.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-115"
                    />
                  </div>

                  <h3
                    style={{ transform: "translateZ(14px)" }}
                    className="text-sm font-bold text-slate-800 transition-colors group-hover:text-[#0F3860]"
                  >
                    {category.name}
                  </h3>
                  <p
                    style={{ transform: "translateZ(10px)" }}
                    className="mt-1 text-xs text-slate-400 font-medium"
                  >
                    {category.count}
                  </p>
                </Link>
              </TiltCard>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

