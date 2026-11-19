import { VendorDashboardContent } from "@/features/vendor/components/VendorDashboardContent";

export const metadata = {
  title: "Tổng quan gian hàng | HaiSan Express",
  description: "Đơn cần xử lý, sản phẩm đang bán, tồn kho thấp và doanh thu của gian hàng.",
};

export default function VendorDashboardPage() {
  return <VendorDashboardContent />;
}
