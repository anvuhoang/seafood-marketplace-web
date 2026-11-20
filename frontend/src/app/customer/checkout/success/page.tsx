import { Suspense } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { CustomerFooter } from "@/components/shared/CustomerFooter";
import { CustomerHeader } from "@/components/shared/CustomerHeader";
import { CheckoutSuccessView } from "@/features/checkout/components/CheckoutSuccessView";

export const metadata = {
  title: "Đặt hàng thành công | HaiSan Express",
  description: "Đơn hàng của bạn đã được ghi nhận.",
};

export default function CheckoutSuccessPage() {
  return (
    <ProtectedRoute allowedRoles={["CUSTOMER", "VENDOR", "ADMIN"]}>
      <div className="flex min-h-screen flex-col bg-slate-50/50">
        <CustomerHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <Suspense fallback={null}>
            <CheckoutSuccessView />
          </Suspense>
        </main>
        <CustomerFooter />
      </div>
    </ProtectedRoute>
  );
}
