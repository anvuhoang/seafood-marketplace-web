import { Suspense } from "react";
import { notFound, unstable_rethrow } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { CustomerHeader } from "@/components/shared/CustomerHeader";
import { CustomerFooter } from "@/components/shared/CustomerFooter";
import {
  CategoryStateMessage,
  ProductGridSkeleton,
} from "@/features/category/components/CategoryStates";
import { getProductListing } from "../api/catalog.api";
import { ProductListing } from "../types/catalog.types";
import { parseCatalogQuery } from "../utils/catalog-query";
import { CatalogView } from "./CatalogView";

type RawSearchParams = Record<string, string | string[] | undefined>;

interface CatalogRouteProps {
  searchParams: Promise<RawSearchParams>;
  /** Category slug from a /categories/[slug] path. */
  categorySlug?: Promise<string>;
}

const ALL_SEAFOOD_DESCRIPTION =
  "Khám phá hải sản từ nhiều cửa hàng uy tín, chủ động lựa chọn theo loại đặc sản, ngư trường địa phương, mức giá cạnh tranh và công nghệ bảo quản chuỗi lạnh.";

/**
 * Shared page for /products and /categories/[slug]: header, footer and the
 * listing, which streams in behind a skeleton.
 */
export function CatalogRoute(props: CatalogRouteProps) {
  return (
    <div className="min-h-screen bg-slate-50/40 flex flex-col">
      <CustomerHeader />
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-6">
        <Suspense
          fallback={
            <div className="space-y-6">
              <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
                <div className="hidden h-[480px] animate-pulse rounded-xl bg-slate-100 lg:block" />
                <ProductGridSkeleton />
              </div>
            </div>
          }
        >
          <CatalogContent {...props} />
        </Suspense>
      </main>
      <CustomerFooter />
    </div>
  );
}

async function CatalogContent({ searchParams, categorySlug }: CatalogRouteProps) {
  const fixedCategory = categorySlug ? await categorySlug : undefined;
  const query = parseCatalogQuery(await searchParams, fixedCategory);

  let listing: ProductListing;
  try {
    listing = await getProductListing(query);
  } catch (error) {
    // Let Next.js prerender interrupts through; only real failures are handled here.
    unstable_rethrow(error);
    console.error("Failed to load product listing:", error);

    return (
      <CategoryStateMessage
        tone="error"
        icon={AlertTriangle}
        title="Không thể tải danh sách hải sản"
        description="Đã có lỗi khi kết nối tới máy chủ. Vui lòng thử lại sau ít phút."
        action={{ href: fixedCategory ? `/categories/${fixedCategory}` : "/products", label: "Thử lại" }}
      />
    );
  }

  if (!fixedCategory) {
    return (
      <CatalogView
        listing={listing}
        query={query}
        title="Tất cả hải sản"
        description={ALL_SEAFOOD_DESCRIPTION}
        breadcrumb={[{ label: "Trang chủ", href: "/" }, { label: "Tất cả hải sản" }]}
      />
    );
  }

  // Facets only list visible categories, so unknown or inactive ones are not found.
  const category = listing.facets.categories.find((c) => c.value === fixedCategory);
  if (!category) {
    notFound();
  }

  return (
    <CatalogView
      listing={listing}
      query={query}
      title={category.label}
      description={`Hải sản thuộc danh mục ${category.label} đang được các vựa uy tín mở bán. Lọc theo ngư trường, mức giá hoặc vựa để chọn nhanh hơn.`}
      breadcrumb={[
        { label: "Trang chủ", href: "/" },
        { label: "Danh mục hải sản", href: "/categories" },
        { label: category.label },
      ]}
    />
  );
}
