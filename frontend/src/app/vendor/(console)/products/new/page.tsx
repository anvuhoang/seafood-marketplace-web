import { VendorProductNewView } from "@/features/vendor/components/VendorProductNewView";

export const metadata = {
  title: "Thêm sản phẩm | HaiSan Express",
  description: "Bán sản phẩm có sẵn trên sàn hoặc tạo sản phẩm mới cho gian hàng.",
};

// Rendered behind a client-side sign-in check, so there is no instant shell to validate.
export const instant = false;

export default function VendorNewProductPage() {
  return <VendorProductNewView />;
}
