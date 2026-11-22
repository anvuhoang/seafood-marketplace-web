import { VendorProductsView } from "@/features/vendor/components/VendorProductsView";

export const metadata = {
  title: "Quản lý sản phẩm gian hàng | HaiSan Express",
  description: "Theo dõi danh mục hải sản, giá bán và tồn kho của gian hàng.",
};

// Rendered behind a client-side sign-in check, so there is no instant shell to validate.
export const instant = false;

export default function VendorProductsPage() {
  return <VendorProductsView />;
}
