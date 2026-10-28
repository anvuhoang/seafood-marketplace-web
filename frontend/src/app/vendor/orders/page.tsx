import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { CustomerHeader } from "@/components/shared/CustomerHeader";
import { CustomerFooter } from "@/components/shared/CustomerFooter";
import { ClipboardList, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";

export const metadata = {
  title: "Đơn Hàng Cần Chuẩn Bị | HaiSan Express Vendor",
  description: "Xử lý đóng thùng xốp oxy và giao hàng cho shipper.",
};

export default function VendorOrdersPage() {
  const vendorOrders = [
    {
      id: "VO-2026-902",
      customer: "Trần Hoàng Long",
      phone: "0912***456",
      product: "Tôm Sú Biển Tươi Sống Loại 1 (Size 15 - 20 con/kg)",
      weight: "2.5 kg",
      prep: "Bơi sống (bao oxy)",
      total: 1050000,
      time: "10 phút trước",
      address: "Quận 1, TP. Hồ Chí Minh",
    },
    {
      id: "VO-2026-901",
      customer: "Nhà hàng Biển Đông (Chị Trâm)",
      phone: "0988***112",
      product: "Tôm Sú Biển Tươi Sống Loại 1 (Size 15 - 20 con/kg)",
      weight: "15 kg",
      prep: "Bơi sống (bao oxy)",
      total: 6300000,
      time: "25 phút trước",
      address: "Tân Bình, TP. Hồ Chí Minh",
    },
  ];

  return (
    <ProtectedRoute allowedRoles={["VENDOR", "ADMIN"]}>
      <div className="min-h-screen bg-slate-50/50 flex flex-col">
        <CustomerHeader />

        <main className="flex-1 mx-auto max-w-5xl w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900">
                  Đơn Hàng Vựa Cần Chuẩn Bị
                </h1>
                <p className="text-xs text-slate-400">
                  Đóng gói thùng xốp đá cay giữ sống trong vòng 20 phút
                </p>
              </div>
            </div>

            <Link
              href="/vendor/dashboard"
              className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Về Dashboard</span>
            </Link>
          </div>

          <div className="space-y-4">
            {vendorOrders.map((ord) => (
              <div
                key={ord.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">
                      #{ord.id}
                    </span>
                    <span className="text-slate-400">• {ord.time}</span>
                  </div>
                  <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                    Cần đóng oxy gấp (Hỏa tốc 2H)
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-900">
                      {ord.product}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Khách hàng: <strong>{ord.customer}</strong> ({ord.phone}) •{" "}
                      {ord.address}
                    </p>
                    <p className="text-xs text-slate-500">
                      Khối lượng: <strong>{ord.weight}</strong> • Sơ chế:{" "}
                      <span className="text-emerald-700 font-semibold">
                        {ord.prep}
                      </span>
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-black text-[#E63946]">
                      {formatPrice(ord.total)}
                    </div>
                    <button
                      type="button"
                      onClick={() => alert(`Đã xác nhận đóng thùng đơn ${ord.id}!`)}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Xác nhận đóng thùng</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>

        <CustomerFooter />
      </div>
    </ProtectedRoute>
  );
}

