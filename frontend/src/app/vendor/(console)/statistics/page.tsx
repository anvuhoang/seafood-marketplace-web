import { Suspense } from "react";
import { StatsSkeleton, VendorStatisticsView } from "@/features/vendor/components/VendorStatisticsView";

export const metadata = {
  title: "Thống kê và doanh thu | HaiSan Express",
  description: "Doanh thu theo ngày, đơn hoàn tất, tỷ lệ hủy và sản phẩm bán chạy của gian hàng.",
};

/** The period is read from the URL, so the view renders inside Suspense (Cache Components). */
export default function VendorStatisticsPage() {
  return (
    <Suspense fallback={<StatsSkeleton />}>
      <VendorStatisticsView />
    </Suspense>
  );
}
