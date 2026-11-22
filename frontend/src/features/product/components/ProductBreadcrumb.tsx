import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ProductDetail } from "../types/product.types";

interface ProductBreadcrumbProps {
  product: ProductDetail;
}

export function ProductBreadcrumb({ product }: ProductBreadcrumbProps) {
  const category = product.categories[0];

  return (
    <nav
      aria-label="Breadcrumb"
      className="border-b border-slate-100 bg-slate-50/60 py-2.5 text-xs text-slate-500"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-1.5 px-4 sm:px-6 lg:px-8 overflow-x-auto whitespace-nowrap">
        <Link href="/" className="hover:text-[#0F3860] transition-colors">
          Trang chủ
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />

        {category ? (
          <Link href={`/categories/${category.slug}`} className="hover:text-[#0F3860] transition-colors">
            {category.name}
          </Link>
        ) : (
          <Link href="/products" className="hover:text-[#0F3860] transition-colors">
            Tất cả hải sản
          </Link>
        )}
        <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />

        <span className="font-semibold text-slate-800 truncate max-w-md">
          {product.name}
        </span>
      </div>
    </nav>
  );
}
