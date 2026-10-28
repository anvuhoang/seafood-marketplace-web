import { CustomerHeader } from "@/components/shared/CustomerHeader";
import { CustomerFooter } from "@/components/shared/CustomerFooter";
import { flagshipProductMock } from "@/features/product/data/product-detail.mock";
import { ProductCard } from "@/features/home/components/ProductCard";
import { Anchor, ShieldCheck, MapPin, Star, Clock } from "lucide-react";
import Link from "next/link";

interface VendorPageProps {
  params: Promise<{ slug: string }>;
}

export default async function VendorStorefrontPage({
  params,
}: VendorPageProps) {
  const { slug } = await params;
  const vendor = flagshipProductMock.vendor;

  const vendorProducts = [
    {
      id: "prod-1",
      name: "Tôm Sú Biển Tươi Sống Loại 1 (Size 15 - 20 con/kg)",
      category: "tom-song",
      origin: "Phú Quốc",
      originDetail: "Nước mặn / Phú Quốc",
      shopName: vendor.name,
      badge: "Bán chạy",
      badgeType: "red" as const,
      note: "Được đóng thùng oxy sống",
      price: 420000,
      unit: "kg",
      image:
        "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=800&q=80",
      inStock: true,
      rating: 4.9,
    },
    ...flagshipProductMock.relatedProducts.map((p) => ({
      id: p.id,
      name: p.name,
      category: "hai-san",
      origin: "Phú Quốc",
      originDetail: "Vựa Phú Quốc Xanh",
      shopName: vendor.name,
      badge: p.badge || "Tươi ngon",
      badgeType: "blue" as const,
      note: p.tag || "Đóng gói tiêu chuẩn vựa",
      price: p.price,
      unit: p.unit,
      image: p.image,
      inStock: p.inStock,
      rating: 4.8,
    })),
  ];

  return (
    <div className="min-h-screen bg-slate-50/40 flex flex-col">
      <CustomerHeader />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Vendor Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0F3860] to-[#1E3A8A] text-white p-6 sm:p-10 shadow-lg">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-start gap-5">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white text-[#0F3860] shadow-md">
                <Anchor className="h-10 w-10" />
              </div>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black">{vendor.name}</h1>
                  <span className="flex items-center gap-1 rounded-md bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 text-xs font-bold border border-emerald-400/30">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Đối tác vựa chuẩn xanh
                  </span>
                </div>
                <p className="flex items-center gap-1 text-xs text-slate-200">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
                  <span>{vendor.address}</span>
                </p>
                <p className="text-xs text-slate-300 max-w-2xl pt-1">
                  {vendor.description}
                </p>
              </div>
            </div>

            {/* Vendor Badges */}
            <div className="flex items-center gap-6 rounded-2xl bg-white/10 backdrop-blur-xs p-4 border border-white/10">
              <div className="text-center">
                <div className="text-lg font-black text-white">
                  {vendor.positiveRatingPercent}%
                </div>
                <div className="text-[11px] text-slate-300">Tỷ lệ hài lòng</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-black text-cyan-300">
                  ~{vendor.responseTimeMinutes} Phút
                </div>
                <div className="text-[11px] text-slate-300">Chuẩn bị đơn</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-black text-amber-300">
                  {vendor.ratingAverage} / 5.0
                </div>
                <div className="text-[11px] text-slate-300">Đánh giá uy tín</div>
              </div>
            </div>
          </div>
        </div>

        {/* Vendor Products Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-lg font-black text-slate-900">
              Tất Cả Hải Sản Của Gian Hàng ({vendorProducts.length})
            </h2>
            <Link
              href="/"
              className="text-xs font-bold text-[#0F3860] hover:underline"
            >
              ← Về trang chủ
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {vendorProducts.map((prod) => (
              <ProductCard key={prod.id} product={prod as any} />
            ))}
          </div>
        </div>
      </main>

      <CustomerFooter />
    </div>
  );
}
