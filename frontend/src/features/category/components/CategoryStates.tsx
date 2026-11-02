import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface CategoryStateMessageProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { href: string; label: string };
  tone?: "neutral" | "error";
}

/** Empty and error states for category pages. */
export function CategoryStateMessage({
  icon: Icon,
  title,
  description,
  action,
  tone = "neutral",
}: CategoryStateMessageProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"
    >
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
          tone === "error" ? "bg-rose-50 text-rose-600" : "bg-sky-50 text-[#0F3860]"
        }`}
      >
        <Icon className="h-6 w-6" />
      </span>
      <h2 className="mt-4 text-base font-bold text-slate-900">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>
      {action && (
        <Link
          href={action.href}
          className="mt-5 rounded-xl bg-[#0F3860] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#0A2744]"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

/** Loading placeholder shaped like a grid of category cards. */
export function CategoryGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="Đang tải danh mục" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col items-center rounded-2xl border border-slate-100 bg-white p-5">
          <div className="h-24 w-24 animate-pulse rounded-full bg-slate-100 sm:h-28 sm:w-28" />
          <div className="mt-4 h-3 w-20 animate-pulse rounded bg-slate-100" />
          <div className="mt-2 h-2.5 w-14 animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

/** Loading placeholder shaped like a grid of product cards. */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="Đang tải sản phẩm" className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="aspect-4/3 animate-pulse bg-slate-100" />
          <div className="space-y-2 p-4">
            <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
            <div className="h-8 w-full animate-pulse rounded-xl bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
