import { AdminDashboardView } from "@/features/admin/components/AdminDashboardView";

export const metadata = {
  title: "Tổng quan | HaiSan Express Admin",
  description: "Thống kê người dùng, vựa, sản phẩm, đơn hàng và doanh thu của hệ thống.",
};

// Rendered behind a client-side sign-in check, so there is no instant shell to validate.
export const instant = false;

export default function AdminDashboardPage() {
  return <AdminDashboardView />;
}
