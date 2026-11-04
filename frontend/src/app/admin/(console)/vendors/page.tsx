import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { CustomerHeader } from "@/components/shared/CustomerHeader";
import { CustomerFooter } from "@/components/shared/CustomerFooter";
import { AdminVendorsView } from "@/features/admin/components/AdminVendorsView";

export const metadata = {
  title: "Duyệt vựa | HaiSan Express Admin",
  description: "Duyệt, từ chối, khóa và mở khóa gian hàng của các vựa đối tác.",
};

export default function AdminVendorsPage() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN"]}>
      <div className="flex min-h-screen flex-col bg-white">
        <CustomerHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <AdminVendorsView />
        </main>
        <CustomerFooter />
      </div>
    </ProtectedRoute>
  );
}
