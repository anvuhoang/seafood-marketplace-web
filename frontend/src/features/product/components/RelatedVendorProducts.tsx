import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CatalogProductCard } from "@/features/catalog/components/CatalogProductCard";
import { ProductListingItem } from "@/features/catalog/types/catalog.types";

interface RelatedVendorProductsProps {
  products: ProductListingItem[];
  /** Other products this vendor sells, excluding the current one. */
  totalCount: number;
  vendorName: string;
  vendorSlug: string;
}

export function RelatedVendorProducts({
  products,
  totalCount,
  vendorName,
  vendorSlug,
}: RelatedVendorProductsProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Sản phẩm khác từ {vendorName}
          </h2>
          <p className="text-xs text-slate-400">Đặt cùng một vựa để giao chung một chuyến</p>
        </div>

        <Link
          href={`/vendor/${vendorSlug}`}
          className="flex items-center gap-1 text-xs font-bold text-[#0F3860] hover:underline"
        >
          <span>Xem tất cả {totalCount} sản phẩm khác của vựa</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {products.map((product) => (
          <CatalogProductCard key={product.id} product={product} view="grid" />
        ))}
      </div>
    </div>
  );
}
