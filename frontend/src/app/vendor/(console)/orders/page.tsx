import { ShoppingBag } from "lucide-react";
import { VendorComingSoon } from "@/features/vendor/components/VendorComingSoon";
import { VendorPageHeader } from "@/features/vendor/components/VendorPageHeader";

export const metadata = {
  title: "Quản lý đơn hàng | HaiSan Express",
  description: "Theo dõi và xử lý các đơn hàng của gian hàng.",
};

export default function VendorOrdersPage() {
  return (
    <>
      <VendorPageHeader title="Quản lý đơn hàng" description="Theo dõi tiến độ chuẩn bị và bàn giao các đơn hàng của gian hàng." />
      <VendorComingSoon
        icon={ShoppingBag}
        title="Chức năng đang được hoàn thiện"
        description="Danh sách đơn, lọc theo trạng thái và xác nhận đơn sẽ có ở đây trong bản cập nhật tới. Các đơn cần xử lý hiện đang hiển thị ở trang Tổng quan."
      />
    </>
  );
}
