import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { CustomerFooter } from "@/components/shared/CustomerFooter";
import { CustomerHeader } from "@/components/shared/CustomerHeader";
import { CustomerOrderDetailView } from "@/features/order/components/CustomerOrderDetailView";

export const metadata = {
  title: "Chi tiết đơn hàng | HaiSan Express",
  description: "Trạng thái từng vựa trong đơn hàng của bạn.",
};

/** The order number is only known at request time, so it is read inside Suspense (Cache Components). */
interface OrderPageProps {
  params: Promise<{ orderNumber: string }>;
}

export default function CustomerOrderPage({ params }: OrderPageProps) {
  return (
    <ProtectedRoute allowedRoles={["CUSTOMER", "VENDOR", "ADMIN"]}>
      <div className="flex min-h-screen flex-col bg-slate-50/50">
        <CustomerHeader />
        <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8 sm:px-6 lg:px-8">
          <Suspense
            fallback={
              <p className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500" role="status">
                <Loader2 className="h-5 w-5 animate-spin text-[#0F3860] motion-reduce:animate-none" aria-hidden="true" />
                Đang tải đơn hàng...
              </p>
            }
          >
            <OrderForNumber params={params} />
          </Suspense>
        </main>
        <CustomerFooter />
      </div>
    </ProtectedRoute>
  );
}

async function OrderForNumber({ params }: OrderPageProps) {
  const { orderNumber } = await params;
  return <CustomerOrderDetailView orderNumber={decodeURIComponent(orderNumber)} />;
}
