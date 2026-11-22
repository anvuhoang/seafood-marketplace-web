import { Suspense } from "react";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { Fish } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { getCategories } from "@/features/category/api/category.api";
import { CategoryGridSkeleton } from "@/features/category/components/CategoryStates";
import { CategorySummary } from "@/features/category/types/category.types";

const HOME_CATEGORY_LIMIT = 6;

export function PopularCategories() {
  return (
    <section className="bg-white py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Mua theo danh mục"
          description="Chọn loại hải sản bạn cần cho bữa cơm gia đình hay buổi tiệc."
          actionHref="/categories"
          actionLabel="Tất cả danh mục"
        />

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
    <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
      {categories.map((category, index) => (
        <ScrollReveal key={category.id} delay={index * 60}>
        <Link href={`/categories/${category.slug}`} className="group block">
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-slate-100">
            {category.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={category.imageUrl}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
              />
            ) : (
              <Fish className="h-8 w-8 text-slate-300" />
            )}
          </div>
          <h3 className="mt-3 text-sm font-semibold text-slate-900 group-hover:text-[#0F3860]">{category.name}</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {category.productCount > 0 ? `${category.productCount} sản phẩm` : "Sắp có hàng"}
          </p>
        </Link>
        </ScrollReveal>
      ))}
    </div>
  );
}
