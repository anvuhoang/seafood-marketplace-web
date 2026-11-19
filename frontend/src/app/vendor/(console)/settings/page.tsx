import { VendorStoreSettingsView } from "@/features/vendor/components/VendorStoreSettingsView";

export const metadata = {
  title: "Cài đặt cửa hàng | HaiSan Express",
  description: "Cập nhật tên, mô tả, hình ảnh, liên hệ và khu vực hoạt động của gian hàng.",
};

export default function VendorSettingsPage() {
  return <VendorStoreSettingsView />;
}
