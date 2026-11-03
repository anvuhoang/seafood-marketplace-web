import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { CustomerHeader } from "@/components/shared/CustomerHeader";
import { CustomerFooter } from "@/components/shared/CustomerFooter";
import { ClipboardList, Clock, Truck, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";

export const metadata = {
  title: "Đơn Mua Của Tôi | HaiSan Express",
  description: "Quản lý và tra cứu tiến trình vận chuyển đơn hàng hải sản tươi sống.",
};

export default function CustomerOrdersPage() {
  const sampleOrders = [
    {
      id: "ORD-2026-8941",
      date: "27/10/2026",
      vendor: "Vựa Thủy Sản Phú Quốc Xanh",
      productName: "Tôm Sú Biển Tươi Sống Loại 1 (Size 15 - 20 con/kg)",
      quantity: "2 kg",
      prep: "Bơi sống (bao oxy)",
      total: 840000,
      status: "SHIPPING",
      statusText: "Đang giao hỏa tốc (còn 25 phút)",
    },
    {
      id: "ORD-2026-7730",
      date: "20/10/2026",
      vendor: "Vựa Ghẹ Xanh Phan Thiết Cô Ba",
      productName: "Ghẹ Xanh Sống Loại 1 (3 - 4 con/kg)",
      quantity: "1.5 kg",
      prep: "Bơi sống (bao oxy)",
      total: 690000,
      status: "COMPLETED",
      statusText: "Đã giao thành công",
    },
  ];

  return (
    <ProtectedRoute allowedRoles={["CUSTOMER", "VENDOR", "ADMIN"]}>
      <div className="min-h-screen bg-slate-50/50 flex flex-col">
        <CustomerHeader />

        <main className="flex-1 mx-auto max-w-5xl w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F3860] text-white">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  Đơn Mua Của Tôi
                </h1>
                <p className="text-xs text-slate-400">
                  Theo dõi tiến trình bảo quản sống và lịch trình giao hàng
                </p>
              </div>
            </div>

            <Link
              href="/"
              className="text-xs font-bold text-[#0F3860] hover:underline"
            >
              + Đặt thêm hải sản
            </Link>
          </div>

          {/* Orders list */}
          <div className="space-y-4">
            {sampleOrders.map((ord) => (
              <div
                key={ord.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">
                      #{ord.id}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500">{ord.date}</span>
                    <span className="text-slate-300">•</span>
                    <span className="font-semibold text-slate-700">
                      {ord.vendor}
                    </span>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      ord.status === "SHIPPING"
                        ? "bg-sky-50 text-sky-700 border border-sky-200"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}
                  >
                    {ord.statusText}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-900">
                      {ord.productName}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Số lượng: <strong>{ord.quantity}</strong> | Sơ chế:{" "}
                      <span className="text-[#0F3860] font-medium">
                        {ord.prep}
                      </span>
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-bold text-[#E63946]">
                      {formatPrice(ord.total)}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Thùng xốp oxy miễn phí
                    </div>
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

