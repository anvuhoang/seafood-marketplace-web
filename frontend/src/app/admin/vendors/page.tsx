import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { CustomerHeader } from "@/components/shared/CustomerHeader";
import { CustomerFooter } from "@/components/shared/CustomerFooter";
import { Store, Check, X, ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Duyệt Vựa Đối Tác | HaiSan Express Admin",
  description: "Kiểm duyệt giấy phép ATTP và điều kiện hồ chứa oxy của đối tác bán hàng.",
};

export default function AdminVendorsPage() {
  const pendingVendors = [
    {
      id: "VEN-2026-04",
      name: "Vựa Hải Sản Đảo Phú Quốc Xanh",
      owner: "Nguyễn Văn Hải",
      location: "Hàm Ninh, Phú Quốc, Kiên Giang",
      tanks: "6 bồn oxy tuần hoàn",
      license: "ATTP-KG-2026-881 (Hợp lệ)",
      status: "ACTIVE",
    },
    {
      id: "VEN-2026-05",
      name: "Vựa Ghẹ Sống Côn Đảo Hải Đăng",
      owner: "Lê Văn Đăng",
      location: "Huyện Côn Đảo, Bà Rịa - Vũng Tàu",
      tanks: "4 bồn giữ lạnh",
      license: "ATTP-VT-2026-102 (Đang chờ duyệt)",
      status: "PENDING",
    },
  ];

  return (
    <ProtectedRoute allowedRoles={["ADMIN"]}>
      <div className="min-h-screen bg-slate-50/50 flex flex-col">
        <CustomerHeader />

        <main className="flex-1 mx-auto max-w-6xl w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-700 text-white">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900">
                  Duyệt & Quản Lý Đối Tác Vựa Thủy Sản
                </h1>
                <p className="text-xs text-slate-400">
                  Xác minh tiêu chuẩn chuỗi cung ứng lạnh và giấy chứng nhận ATTP
                </p>
              </div>
            </div>

            <Link
              href="/admin/dashboard"
              className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Về Dashboard</span>
            </Link>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Tên Vựa</th>
                  <th className="py-3 px-4">Chủ Đại Diện</th>
                  <th className="py-3 px-4">Địa Chỉ Kho</th>
                  <th className="py-3 px-4">Quy Mô Hồ Nuôi</th>
                  <th className="py-3 px-4">Trạng Thái</th>
                  <th className="py-3 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingVendors.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {v.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">{v.owner}</td>
                    <td className="py-3.5 px-4 text-slate-500">{v.location}</td>
                    <td className="py-3.5 px-4 text-slate-700">{v.tanks}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          v.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {v.status === "ACTIVE" ? "Đã duyệt" : "Chờ duyệt"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5">
                      {v.status === "PENDING" && (
                        <button
                          type="button"
                          onClick={() => alert(`Đã phê duyệt vựa ${v.name}!`)}
                          className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
                        >
                          Duyệt vựa
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>

        <CustomerFooter />
      </div>
    </ProtectedRoute>
  );
}

