import Link from "next/link";
import { homeCategories } from "../data/home.mock";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function PopularCategories() {
  return (
    <section className="bg-white py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Danh mục phổ biến"
          description="Chọn loại hải sản tươi sống bạn yêu thích cho bữa cơm gia đình"
          actionHref="#featured-seafood"
          actionLabel="Xem tất cả danh mục"
        />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 sm:gap-5">
          {homeCategories.map((category) => (
            <Link
              key={category.id}
              href="#featured-seafood"
              className="group flex flex-col items-center rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-xs transition-all duration-300 hover:-translate-y-1.5 hover:border-sky-300 hover:shadow-xl hover:shadow-blue-900/5"
            >
              {/* Category Image with circular crop and hover zoom */}
              <div className="relative mb-3.5 h-20 w-20 overflow-hidden rounded-full border-2 border-slate-100 bg-slate-50 transition-all duration-300 group-hover:border-[#0F3860] group-hover:scale-105 sm:h-24 sm:w-24">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={category.image}
                  alt={category.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>

              <h3 className="text-sm font-bold text-slate-800 transition-colors group-hover:text-[#0F3860]">
                {category.name}
              </h3>
              <p className="mt-1 text-xs text-slate-400 font-medium">
                {category.count}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
