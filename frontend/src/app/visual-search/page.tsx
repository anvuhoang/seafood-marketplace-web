import type { Metadata } from "next";
import { CustomerHeader } from "@/components/shared/CustomerHeader";
import { CustomerFooter } from "@/components/shared/CustomerFooter";
import { VisualSearchView } from "@/features/visual-search/components/VisualSearchView";

export const metadata: Metadata = {
  title: "Tìm hải sản bằng hình ảnh - HaiSanExpress",
  description:
    "Tải ảnh hải sản bạn muốn mua, hệ thống gợi ý loài có trong ảnh và các sản phẩm đang bán trên sàn.",
};

export default function VisualSearchPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <CustomerHeader />
      <main className="flex-1">
        <VisualSearchView />
      </main>
      <CustomerFooter />
    </div>
  );
}
