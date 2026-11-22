import { Suspense } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { CustomerFooter } from "@/components/shared/CustomerFooter";
import { CustomerHeader } from "@/components/shared/CustomerHeader";
import { CheckoutView } from "@/features/checkout/components/CheckoutView";

export const metadata = {
  title: "Đặt hàng & Thanh toán | HaiSan Express",
  description: "Nhập thông tin giao hàng và xác nhận đơn hải sản của bạn.",
};

export default function CheckoutPage() {
  return (
    <ProtectedRoute allowedRoles={["CUSTOMER", "VENDOR", "ADMIN"]}>
      <div className="flex min-h-screen flex-col bg-slate-50/50">
        <CustomerHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {/* useSearchParams needs a boundary while the page is prepared. */}
          <Suspense fallback={null}>
            <CheckoutView />
          </Suspense>
        </main>
        <CustomerFooter />
      </div>
    </ProtectedRoute>
  );
}
