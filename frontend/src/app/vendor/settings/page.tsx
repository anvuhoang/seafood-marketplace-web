import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { CustomerHeader } from "@/components/shared/CustomerHeader";
import { CustomerFooter } from "@/components/shared/CustomerFooter";
import { VendorStoreSettingsView } from "@/features/vendor/components/VendorStoreSettingsView";

export const metadata = {
  title: "Hồ sơ gian hàng | HaiSan Express",
  description: "Cập nhật tên, mô tả, hình ảnh, liên hệ và khu vực hoạt động của gian hàng.",
};

export default function VendorSettingsPage() {
  return (
    <ProtectedRoute allowedRoles={["VENDOR"]}>
      <div className="min-h-screen bg-slate-50/50 flex flex-col">
        <CustomerHeader />
        <VendorStoreSettingsView />
        <CustomerFooter />
      </div>
    </ProtectedRoute>
  );
}
