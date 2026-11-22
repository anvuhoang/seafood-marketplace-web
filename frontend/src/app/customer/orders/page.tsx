import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { CustomerFooter } from "@/components/shared/CustomerFooter";
import { CustomerHeader } from "@/components/shared/CustomerHeader";
import { CustomerOrdersView } from "@/features/order/components/CustomerOrdersView";

export const metadata = {
  title: "Đơn mua của tôi | HaiSan Express",
  description: "Theo dõi trạng thái các đơn hàng hải sản của bạn.",
};

export default function CustomerOrdersPage() {
  return (
    <ProtectedRoute allowedRoles={["CUSTOMER", "VENDOR", "ADMIN"]}>
      <div className="flex min-h-screen flex-col bg-[#EEF4FB]">
        <CustomerHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8 sm:px-6 lg:px-8">
          <CustomerOrdersView />
        </main>
        <CustomerFooter />
      </div>
    </ProtectedRoute>
  );
}
