import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { CustomerHeader } from "@/components/shared/CustomerHeader";
import { CustomerFooter } from "@/components/shared/CustomerFooter";
import { VendorDashboardContent } from "@/features/vendor/components/VendorDashboardContent";

export const metadata = {
  title: "Bảng Điều Khiển Vựa | HaiSan Express",
  description: "Trung tâm quản lý bán hàng, tồn kho bể nuôi và đơn hàng của vựa đối tác.",
};

export default function VendorDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["VENDOR"]}>
      <div className="min-h-screen bg-slate-50/50 flex flex-col">
        <CustomerHeader />
        <VendorDashboardContent />
        <CustomerFooter />
      </div>
    </ProtectedRoute>
  );
}
