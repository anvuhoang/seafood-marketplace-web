import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { CustomerHeader } from "@/components/shared/CustomerHeader";
import { CustomerFooter } from "@/components/shared/CustomerFooter";
import { Package, Plus, Edit3, Eye, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";

export const metadata = {
  title: "Quản Lý Sản Phẩm Vựa | HaiSan Express",
  description: "Cập nhật giá, số lượng tồn kho và thông số bảo quản cho từng bồn hải sản.",
};

export default function VendorProductsPage() {
  const products = [
    {
      id: "prod-1",
      name: "Tôm Sú Biển Tươi Sống Loại 1 (Size 15 - 20 con/kg)",
      sku: "SBD-TZ04-QSC",
      stock: 14,
      unit: "kg",
      price: 420000,
      status: "ACTIVE",
      statusText: "Đang mở bán",
    },
    {
      id: "prod-2",
      name: "Ghẹ Xanh Sống Phú Quốc Tuyển Chọn",
      sku: "GHE-PQ-01",
      stock: 24,
      unit: "kg",
      price: 390000,
      status: "ACTIVE",
      statusText: "Đang mở bán",
    },
    {
      id: "prod-3",
      name: "Mực Ống Câu Đêm Phú Quốc Loại 1",
      sku: "MUC-PQ-01",
      stock: 18,
      unit: "kg",
      price: 310000,
      status: "ACTIVE",
      statusText: "Đang mở bán",
    },
    {
      id: "prod-discontinued",
      name: "Tôm Hùm Đỏ Côn Đảo (Ngừng kinh doanh)",
      sku: "HUM-CD-01",
      stock: 0,
      unit: "kg",
      price: 1850000,
      status: "INACTIVE",
      statusText: "Ngừng kinh doanh",
    },
  ];

  return (
    <ProtectedRoute allowedRoles={["VENDOR", "ADMIN"]}>
      <div className="min-h-screen bg-slate-50/50 flex flex-col">
        <CustomerHeader />

        <main className="flex-1 mx-auto max-w-6xl w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900">
                  Quản Lý Danh Mục & Kho Hàng Vựa
                </h1>
                <p className="text-xs text-slate-400">
                  Quản lý số lượng tồn kho từng bồn nuôi sục oxy và mức giá theo ngày
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

          {/* Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Tên Sản Phẩm</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Tồn Kho</th>
                  <th className="py-3 px-4">Giá Bán</th>
                  <th className="py-3 px-4">Trạng Thái</th>
                  <th className="py-3 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-800 max-w-xs truncate">
                      {p.name}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      {p.sku}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {p.stock} {p.unit}
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-[#E63946]">
                      {formatPrice(p.price)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          p.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {p.statusText}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <Link
                        href={`/products/${p.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                      >
                        <Eye className="h-3 w-3" />
                        <span>Xem</span>
                      </Link>
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

