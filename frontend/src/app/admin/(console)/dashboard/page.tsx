import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { CustomerHeader } from "@/components/shared/CustomerHeader";
import { CustomerFooter } from "@/components/shared/CustomerFooter";
import { AdminDashboardView } from "@/features/admin/components/AdminDashboardView";

export const metadata = {
  title: "Tổng quan | HaiSan Express Admin",
  description: "Thống kê người dùng, vựa, sản phẩm, đơn hàng và doanh thu của hệ thống.",
};

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN"]}>
      <div className="flex min-h-screen flex-col bg-slate-50">
        <CustomerHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <AdminDashboardView />
        </main>
        <CustomerFooter />
      </div>
    </ProtectedRoute>
  );
}
