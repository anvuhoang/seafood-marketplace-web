import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { VendorOrderDetailView } from "@/features/vendor/components/VendorOrderDetailView";

export const metadata = {
  title: "Chi tiết đơn hàng | HaiSan Express",
  description: "Xem và xử lý một đơn hàng của gian hàng.",
};

/** The id is only known at request time, so it is read inside Suspense (Cache Components). */
interface OrderPageProps {
  params: Promise<{ id: string }>;
}

export default function VendorOrderPage({ params }: OrderPageProps) {
  return (
    <Suspense
      fallback={
        <p className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500" role="status">
          <Loader2 className="h-5 w-5 animate-spin text-brand motion-reduce:animate-none" aria-hidden="true" />
          Đang tải đơn hàng...
        </p>
      }
    >
      <OrderForId params={params} />
    </Suspense>
  );
}

async function OrderForId({ params }: OrderPageProps) {
  const { id } = await params;
  return <VendorOrderDetailView orderId={id} />;
}
