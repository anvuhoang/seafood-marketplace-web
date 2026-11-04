import { AdminVendorsView } from "@/features/admin/components/AdminVendorsView";

export const metadata = {
  title: "Duyệt vựa | HaiSan Express Admin",
  description: "Duyệt, từ chối, khóa và mở khóa gian hàng của các vựa đối tác.",
};

// Rendered behind a client-side sign-in check, so there is no instant shell to validate.
export const instant = false;

export default function AdminVendorsPage() {
  return <AdminVendorsView />;
}
