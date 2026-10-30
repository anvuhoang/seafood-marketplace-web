import { Suspense } from "react";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { Fish } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TiltCard } from "@/components/ui/TiltCard";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { getCategories } from "@/features/category/api/category.api";
import { CategoryGridSkeleton } from "@/features/category/components/CategoryStates";
import { CategorySummary } from "@/features/category/types/category.types";

const HOME_CATEGORY_LIMIT = 6;

export function PopularCategories() {
  return (
    <section className="bg-white py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal animation="fade-up-3d">
          <SectionHeading
            title="Danh mục phổ biến"
            description="Chọn loại hải sản tươi sống bạn yêu thích cho bữa cơm gia đình"
            actionHref="/categories"
            actionLabel="Xem tất cả danh mục"
          />
        </ScrollReveal>

        <Suspense fallback={<CategoryGridSkeleton count={HOME_CATEGORY_LIMIT} />}>
          <PopularCategoryGrid />
        </Suspense>
      </div>
    </section>
  );
}

async function PopularCategoryGrid() {
  let categories: CategorySummary[];

  try {
    categories = (await getCategories()).slice(0, HOME_CATEGORY_LIMIT);
  } catch (error) {
    // Let Next.js prerender interrupts through; only real failures are handled here.
    unstable_rethrow(error);
    console.error("Failed to load categories:", error);
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        Không thể tải danh mục lúc này.{" "}
        <Link href="/categories" className="font-bold text-[#0F3860] hover:underline">
          Xem tất cả danh mục
        </Link>
      </p>
    );
  }

  if (categories.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">Chưa có danh mục nào được mở bán.</p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 sm:gap-5">
      {categories.map((category, idx) => (
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
              href={`/categories/${category.slug}`}
              className="group flex h-full flex-col items-center rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-xs transition-all duration-300 hover:border-sky-300 hover:shadow-xl hover:shadow-blue-900/10 preserve-3d"
            >
              {/* Category Image with circular crop and 3D depth pop */}
              <div
                style={{ transform: "translateZ(24px)" }}
                className="relative mb-3.5 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-slate-100 bg-slate-50 shadow-sm transition-all duration-300 group-hover:border-[#0F3860] group-hover:shadow-md sm:h-24 sm:w-24"
              >
                {category.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={category.imageUrl}
                    alt={category.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-115"
                  />
                ) : (
                  <Fish className="h-8 w-8 text-slate-300" />
                )}
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
                {category.productCount > 0 ? `${category.productCount} sản phẩm` : "Chưa có sản phẩm"}
              </p>
            </Link>
          </TiltCard>
        </ScrollReveal>
      ))}
    </div>
  );
}
