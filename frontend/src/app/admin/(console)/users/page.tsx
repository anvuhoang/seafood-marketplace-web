import { AdminUsersView } from "@/features/admin/components/AdminUsersView";

export const metadata = {
  title: "Quản lý người dùng | HaiSan Express Admin",
  description: "Tra cứu tài khoản khách hàng, chủ vựa và quản trị viên theo vai trò và trạng thái.",
};

// Rendered behind a client-side sign-in check, so there is no instant shell to validate.
export const instant = false;

export default function AdminUsersPage() {
  return <AdminUsersView />;
}
