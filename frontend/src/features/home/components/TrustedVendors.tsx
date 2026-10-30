import { Suspense } from "react";
import Link from "next/link";
import { Star, MapPin, CheckCircle2, ArrowRight, Anchor } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TiltCard } from "@/components/ui/TiltCard";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { getActiveVendors } from "@/features/vendor/api/vendor.api";
import { VendorSummary } from "@/features/vendor/types/vendor.types";

export function TrustedVendors() {
  return (
    <section id="trusted-vendors" className="bg-slate-50/70 py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollReveal animation="fade-up-3d">
          <SectionHeading
            eyebrow="ĐỐI TÁC & VỰA UY TÍN"
            title="Khám phá các vựa hải sản uy tín"
            description="Trực tiếp từ các vựa, hộ nuôi và nhà phân phối hải sản uy tín, có giấy chứng nhận."
            actionHref="#trusted-vendors"
            actionLabel="Xem tất cả cửa hàng"
          />
        </ScrollReveal>

        <Suspense
          fallback={<p className="py-10 text-center text-sm text-slate-500">Đang tải danh sách vựa...</p>}
        >
          <TrustedVendorGrid />
        </Suspense>
      </div>
    </section>
  );
}

async function TrustedVendorGrid() {
  let vendors: VendorSummary[];

  try {
    vendors = await getActiveVendors();
  } catch (error) {
    console.error("Failed to load vendors:", error);
    return (
      <p className="py-10 text-center text-sm text-slate-500">
        Không thể tải danh sách vựa lúc này.
      </p>
    );
  }

  if (vendors.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-500">
        Chưa có vựa nào đang hoạt động.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {vendors.map((vendor, idx) => {
        const storefrontHref = `/vendor/${vendor.slug}`;
        const image = vendor.coverUrl ?? vendor.logoUrl;

        return (
          <ScrollReveal
            key={vendor.id}
            animation="fade-up-3d"
            delay={idx * 90}
            className="h-full"
          >
            <TiltCard
              maxTilt={6}
              scale={1.02}
              className="h-full rounded-2xl"
            >
            <article className="group flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition-all duration-300 hover:border-slate-300 hover:shadow-2xl hover:shadow-slate-300/50 preserve-3d">
              <div>
                {/* Vendor Cover Image */}
                <Link
                  href={storefrontHref}
                  className="relative flex aspect-[16/10] items-center justify-center overflow-hidden bg-slate-100"
                >
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image}
                      alt={vendor.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-108"
                    />
                  ) : (
                    <Anchor className="h-10 w-10 text-slate-400" />
                  )}
                  <div
                    style={{ transform: "translateZ(26px)" }}
                    className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-full bg-slate-900/85 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm backdrop-blur-xs"
                  >
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span>{vendor.ratingAverage.toFixed(1)}</span>
                    <span className="text-slate-400">({vendor.ratingCount})</span>
                  </div>
                </Link>

                {/* Details */}
                <div className="p-4">
                  <div
                    style={{ transform: "translateZ(16px)" }}
                    className="flex items-center gap-1.5"
                  >
                    <h3 className="text-sm font-bold text-slate-900 transition-colors group-hover:text-[#0F3860]">
                      <Link href={storefrontHref}>
                        {vendor.name}
                      </Link>
                    </h3>
                    {/* Only ACTIVE (approved) vendors are listed */}
                    <span title="Vựa đã được xác minh" className="inline-flex">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-600" />
                    </span>
                  </div>

                  <p
                    style={{ transform: "translateZ(12px)" }}
                    className="mt-1 flex items-center gap-1 text-xs text-slate-500"
                  >
                    <MapPin className="h-3 w-3 shrink-0 text-[#0F3860]" />
                    <span className="truncate">{vendor.location}</span>
                  </p>

                  {vendor.description && (
                    <p
                      style={{ transform: "translateZ(8px)" }}
                      className="mt-2.5 text-xs text-slate-600 leading-relaxed line-clamp-2"
                    >
                      {vendor.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Bottom bar */}
              <div
                style={{ transform: "translateZ(18px)" }}
                className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 p-4 pt-3 text-xs"
              >
                <span className="rounded-md bg-sky-50 px-2 py-1 font-semibold text-[#0F3860]">
                  {vendor.productCount} sản phẩm
                </span>

                <Link
                  href={storefrontHref}
                  className="inline-flex items-center gap-1 font-bold text-[#0F3860] transition-colors hover:text-[#E63946]"
                >
                  <span>Xem gian hàng</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </div>
            </article>
          </TiltCard>
          </ScrollReveal>
        );
      })}
    </div>
  );
}
