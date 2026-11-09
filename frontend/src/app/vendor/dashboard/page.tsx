import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { CustomerHeader } from "@/components/shared/CustomerHeader";
import { CustomerFooter } from "@/components/shared/CustomerFooter";
import { Store, TrendingUp, Package, AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";

export const metadata = {
  title: "Bảng Điều Khiển Vựa | HaiSan Express",
  description: "Trung tâm quản lý bán hàng, tồn kho bể nuôi và đơn hàng của vựa đối tác.",
};

export default function VendorDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["VENDOR", "ADMIN"]}>
      <div className="min-h-screen bg-slate-50/50 flex flex-col">
        <CustomerHeader />

        <main className="flex-1 mx-auto max-w-6xl w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
                <Store className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black text-slate-900">
                    Bảng Điều Khiển Vựa Đối Tác
                  </h1>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                    Kênh Người Bán
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Vựa Thủy Sản Phú Quốc Xanh (Bến Cảng Hàm Ninh)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/vendor/products"
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs"
              >
                Quản lý kho hàng
              </Link>
              <Link
                href="/vendor/orders"
                className="rounded-xl bg-[#0F3860] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#0A2744] shadow-xs"
              >
                Xem 12 đơn cần chuẩn bị
              </Link>
            </div>
          </div>

          {/* Metrics summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-1 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">
                Doanh thu hôm nay
              </span>
              <div className="text-2xl font-black text-[#0F3860]">
                {formatPrice(18420000)}
              </div>
              <p className="text-[11px] text-emerald-600 font-medium">
                +14.2% so với hôm qua
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-1 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">
                Đơn đang chuẩn bị
              </span>
              <div className="text-2xl font-black text-amber-600">12 đơn</div>
              <p className="text-[11px] text-slate-400">Đóng thùng sục oxy 2h</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-1 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">
                Tồn kho hải sản sống
              </span>
              <div className="text-2xl font-black text-emerald-600">328 kg</div>
              <p className="text-[11px] text-slate-400">Trong 6 bồn nuôi sục khí</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-1 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">
                Đánh giá khách hàng
              </span>
              <div className="text-2xl font-black text-slate-900">4.9 / 5.0</div>
              <p className="text-[11px] text-emerald-600 font-medium">
                99.2% phản hồi tích cực
              </p>
            </div>
          </div>

          {/* Quick stock alert */}
          <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>
                <strong>Cảnh báo tồn kho:</strong> Tôm Sú Biển Loại 1 chỉ còn <strong>14 kg</strong> tại hồ 03. Cần cập nhật số lượng nhập mới từ thuyền chài.
              </span>
            </div>
            <Link
              href="/vendor/products"
              className="font-bold underline hover:text-amber-950"
            >
              Cập nhật ngay
            </Link>
          </div>
        </main>

        <CustomerFooter />
      </div>
    </ProtectedRoute>
  );
}

