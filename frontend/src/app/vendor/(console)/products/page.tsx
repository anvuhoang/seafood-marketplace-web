import { Package } from "lucide-react";
import { VendorComingSoon } from "@/features/vendor/components/VendorComingSoon";
import { VendorPageHeader } from "@/features/vendor/components/VendorPageHeader";

export const metadata = {
  title: "Quản lý sản phẩm gian hàng | HaiSan Express",
  description: "Theo dõi danh mục hải sản, giá bán và tồn kho của gian hàng.",
};

export default function VendorProductsPage() {
  return (
    <>
      <VendorPageHeader
        title="Quản lý sản phẩm gian hàng"
        description="Theo dõi danh mục hải sản, giá bán và tồn kho của gian hàng."
      />
      <VendorComingSoon
        icon={Package}
        title="Chức năng đang được hoàn thiện"
        description="Danh sách sản phẩm, chỉnh giá và cập nhật tồn kho sẽ có ở đây trong bản cập nhật tới."
      />
    </>
  );
}
