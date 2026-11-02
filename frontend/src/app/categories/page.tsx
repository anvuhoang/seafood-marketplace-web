import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";
import {
  Anchor,
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  Fish,
  Home,
  LayoutGrid,
  MapPinned,
  Sailboat,
  ShieldCheck,
  Ship,
  Waves,
  Wind,
} from "lucide-react";
import { CustomerHeader } from "@/components/shared/CustomerHeader";
import { CustomerFooter } from "@/components/shared/CustomerFooter";
import { getCategories } from "@/features/category/api/category.api";
import { CategoryStateMessage } from "@/features/category/components/CategoryStates";
import { CategorySummary } from "@/features/category/types/category.types";
import { getRegions } from "@/features/catalog/api/catalog.api";
import { RegionSummary } from "@/features/catalog/types/catalog.types";

export const metadata: Metadata = {
  title: "Danh Mục Hải Sản - HaiSanExpress",
  description: "Khám phá các loại hải sản và ngư trường nổi tiếng trên HaiSan Express.",
};

const REGION_ICONS = [Sailboat, Waves, Anchor, Ship, MapPinned, Fish];

export default function CategoriesPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <CustomerHeader />

      <main className="flex-1">
        {/* Breadcrumb and platform promises */}
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-slate-500">
            <Home className="h-3.5 w-3.5" />
            <Link href="/" className="hover:text-[#0F3860]">Trang chủ</Link>
            <ChevronRight className="h-3 w-3 text-slate-300" />
            <span className="font-semibold text-[#0F3860]">Danh mục hải sản</span>
          </nav>
          <div className="flex flex-wrap gap-2">
            <span className="flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 font-semibold text-[#0F3860]">
              <BadgeCheck className="h-3.5 w-3.5" /> Cam kết cân chuẩn & hoàn bù 60 phút
            </span>
            <span className="flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-slate-500">
              <Wind className="h-3.5 w-3.5" /> Đóng thùng oxy sống 2H
            </span>
          </div>
        </div>

        {/* Hero */}
        <section className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-7xl space-y-5 px-4 py-8 sm:px-6 lg:px-8">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-700">
              <LayoutGrid className="h-3.5 w-3.5" /> Danh mục
            </span>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Khám phá danh mục hải sản</h1>
                <p className="mt-2 text-sm text-slate-600">
                  Tìm loại hải sản yêu thích từ nhiều cửa hàng và vựa đầu mối ven biển uy tín trên HaiSan Express.
                </p>
              </div>
              <nav aria-label="Cách xem danh mục" className="flex gap-1 self-start rounded-lg bg-white p-1 text-xs font-bold shadow-xs">
                <a href="#chung-loai" className="flex items-center gap-1.5 rounded-md bg-[#0F3860] px-3 py-2 text-white">
                  <LayoutGrid className="h-3.5 w-3.5" /> Tất cả chủng loại
                </a>
                <a href="#ngu-truong" className="flex items-center gap-1.5 rounded-md px-3 py-2 text-slate-600 hover:bg-slate-50">
                  <MapPinned className="h-3.5 w-3.5" /> Ngư trường
                </a>
              </nav>
            </div>
            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 rounded-md bg-[#0F3860] px-3 py-2 text-xs font-bold text-white hover:bg-[#0A2744]"
            >
              <Fish className="h-3.5 w-3.5" /> Tất cả sản phẩm
            </Link>
          </div>
        </section>

        {/* Main categories */}
        <section id="chung-loai" className="mx-auto max-w-7xl scroll-mt-24 space-y-5 px-4 py-10 sm:px-6 lg:px-8">
          <SectionTitle
            eyebrow="Theo chủng loại"
            title="Chủng loại hải sản chính"
            description="Các dòng hải sản nước mặn và nước lợ tươi sạch được cập bến trực tiếp từ đội tàu đánh bắt mỗi ngày."
            aside={
              <span className="flex items-center gap-1 self-start rounded-md bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-[#0F3860] sm:self-auto">
                <ShieldCheck className="h-3.5 w-3.5" /> Nguồn gốc vựa xác minh
              </span>
            }
          />
          <Suspense fallback={<CardGridSkeleton count={8} className="h-80" columns="sm:grid-cols-2 lg:grid-cols-4" />}>
            <CategoryGrid />
          </Suspense>
        </section>

        {/* Regions */}
        <section id="ngu-truong" className="scroll-mt-24 bg-sky-50/50">
          <div className="mx-auto max-w-7xl space-y-5 px-4 py-10 sm:px-6 lg:px-8">
            <SectionTitle
              eyebrow="Theo vùng đánh bắt"
              title="Khám phá theo ngư trường & vùng biển nổi tiếng"
              description="Mỗi vùng biển mang hương vị hải sản đặc trưng. Khám phá sản phẩm được vận chuyển trực tiếp từ cảng địa phương."
            />
            <Suspense fallback={<CardGridSkeleton count={6} className="h-44" columns="sm:grid-cols-3 lg:grid-cols-6" />}>
              <RegionGrid />
            </Suspense>
          </div>
        </section>
      </main>

      <CustomerFooter />
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  description,
  aside,
}: {
  eyebrow: string;
  title: string;
  description: string;
  aside?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="flex items-center gap-1.5 text-sm font-medium text-sky-700">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {aside}
    </div>
  );
}

function CardGridSkeleton({ count, className, columns }: { count: number; className: string; columns: string }) {
  return (
    <div aria-busy="true" className={`grid grid-cols-1 gap-4 ${columns}`}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`animate-pulse rounded-xl bg-slate-100 ${className}`} />
      ))}
    </div>
  );
}

async function CategoryGrid() {
  let categories: CategorySummary[];
  try {
    categories = await getCategories();
  } catch (error) {
    // Let Next.js prerender interrupts through; only real failures are handled here.
    unstable_rethrow(error);
    console.error("Failed to load categories:", error);
    return (
      <CategoryStateMessage
        tone="error"
        icon={Fish}
        title="Không thể tải danh mục"
        description="Đã có lỗi khi kết nối tới máy chủ. Vui lòng thử lại sau ít phút."
        action={{ href: "/categories", label: "Thử lại" }}
      />
    );
  }

  if (categories.length === 0) {
    return (
      <CategoryStateMessage
        icon={Fish}
        title="Chưa có danh mục nào"
        description="Các danh mục hải sản sẽ hiển thị tại đây khi được mở bán."
        action={{ href: "/", label: "Về trang chủ" }}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {categories.map((category) => (
        <article
          key={category.id}
          className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs transition hover:shadow-md"
        >
          <Link href={`/categories/${category.slug}`} className="relative block h-44 overflow-hidden bg-slate-100">
            {category.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={category.imageUrl}
                alt={category.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <span className="flex h-full items-center justify-center">
                <Fish className="h-10 w-10 text-slate-300" />
              </span>
            )}
            <span
              className={`absolute top-2 left-2 rounded px-2 py-0.5 text-[10px] font-bold ${
                category.productCount > 0 ? "bg-white/95 text-[#E63946]" : "bg-slate-900/70 text-white"
              }`}
            >
              {category.productCount > 0 ? `${category.productCount} sản phẩm` : "Sắp mở bán"}
            </span>
          </Link>
          <div className="flex flex-1 flex-col p-4">
            <h3 className="text-base font-bold text-slate-900 group-hover:text-[#0F3860]">
              <Link href={`/categories/${category.slug}`}>{category.name}</Link>
            </h3>
            {category.description && (
              <p className="mt-1 text-xs leading-relaxed text-slate-500 line-clamp-2">{category.description}</p>
            )}
            <div className="mt-auto flex items-end justify-between gap-2 pt-4">
              <p className="text-[11px] text-slate-400 line-clamp-2">
                {category.examples.length > 0 ? category.examples.join(" · ") : "Chưa có sản phẩm"}
              </p>
              <Link
                href={`/categories/${category.slug}`}
                className="flex shrink-0 items-center gap-1 text-xs font-bold text-[#0F3860] hover:text-[#E63946]"
              >
                Xem sản phẩm <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

async function RegionGrid() {
  let regions: RegionSummary[];
  try {
    regions = await getRegions();
  } catch (error) {
    // Let Next.js prerender interrupts through; only real failures are handled here.
    unstable_rethrow(error);
    console.error("Failed to load regions:", error);
    return <p className="text-sm text-slate-500">Không thể tải danh sách ngư trường lúc này.</p>;
  }

  if (regions.length === 0) {
    return <p className="text-sm text-slate-500">Chưa có ngư trường nào có hàng đang bán.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {regions.map((region, index) => {
        const Icon = REGION_ICONS[index % REGION_ICONS.length];
        return (
          <Link
            key={region.key}
            href={`/products?region=${encodeURIComponent(region.key)}`}
            className="group flex flex-col items-center rounded-xl border border-slate-200 bg-white p-4 text-center transition hover:border-slate-300 hover:shadow-md"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-[#0F3860]">
              <Icon className="h-5 w-5" />
            </span>
            <h3 className="mt-3 text-sm font-bold tracking-tight text-slate-900">{region.district}</h3>
            <p className="text-[11px] text-slate-400">{region.province}</p>
            <p className="mt-1.5 text-[11px] text-slate-500 line-clamp-2">
              {region.topCategories.join(" · ")}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              {region.productCount} sản phẩm · {region.vendorCount} vựa
            </p>
            <span className="mt-2 flex items-center gap-1 text-[11px] font-bold text-[#0F3860] group-hover:text-[#E63946]">
              Xem sản phẩm <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
        );
      })}
    </div>
  );
}
