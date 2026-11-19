import { VendorDashboardContent } from "@/features/vendor/components/VendorDashboardContent";

export const metadata = {
  title: "Tổng quan gian hàng | HaiSan Express",
  description: "Đơn cần xử lý, sản phẩm đang bán, tồn kho thấp và doanh thu của gian hàng.",
};

// Rendered behind a client-side sign-in check, so there is no instant shell to validate.
export const instant = false;

export default function VendorDashboardPage() {
  return <VendorDashboardContent />;
}
