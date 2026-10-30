import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { CustomerHeader } from "@/components/shared/CustomerHeader";
import { CustomerFooter } from "@/components/shared/CustomerFooter";
import { ShieldCheck, Users, Store, TrendingUp, AlertCircle } from "lucide-react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";

export const metadata = {
  title: "Cổng Quản Trị Hệ Thống | HaiSan Express Admin",
  description: "Bảng điều khiển quản trị marketplace, người dùng và đối tác vựa.",
};

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN"]}>
      <div className="min-h-screen bg-slate-50/50 flex flex-col">
        <CustomerHeader />

        <main className="flex-1 mx-auto max-w-6xl w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-700 text-white shadow-sm">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black text-slate-900">
                    Cổng Quản Trị Hệ Thống (Admin Panel)
                  </h1>
                  <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-bold text-purple-800">
                    Toàn Quyền Quản Trị
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Giám sát hoạt động giao dịch sàn thương mại điện tử hải sản
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/admin/vendors"
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs"
              >
                Duyệt 3 Vựa Mới
              </Link>
              <Link
                href="/admin/users"
                className="rounded-xl bg-[#0F3860] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#0A2744] shadow-xs"
              >
                Quản lý Người Dùng
              </Link>
            </div>
          </div>

          {/* Admin Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-1 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">
                Tổng GMV Tháng Này
              </span>
              <div className="text-2xl font-black text-[#0F3860]">
                {formatPrice(482500000)}
              </div>
              <p className="text-[11px] text-emerald-600 font-medium">
                +22.8% so với tháng trước
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-1 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">
                Đối tác vựa hoạt động
              </span>
              <div className="text-2xl font-black text-emerald-600">48 vựa</div>
              <p className="text-[11px] text-slate-400">Đã qua kiểm định HACCP</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-1 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">
                Khách hàng đăng ký
              </span>
              <div className="text-2xl font-black text-purple-700">12,450</div>
              <p className="text-[11px] text-emerald-600 font-medium">
                +185 tài khoản tuần này
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-1 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">
                Đơn giao hỏa tốc 2h
              </span>
              <div className="text-2xl font-black text-slate-900">1,842 đơn</div>
              <p className="text-[11px] text-slate-400">Tỷ lệ sống đạt 99.8%</p>
            </div>
          </div>
        </main>

        <CustomerFooter />
      </div>
    </ProtectedRoute>
  );
}

