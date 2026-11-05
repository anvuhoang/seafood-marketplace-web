import { AdminCategoriesView } from "@/features/admin/components/AdminCategoriesView";

export const metadata = {
  title: "Danh mục | HaiSan Express Admin",
  description: "Tạo, sửa, ẩn và hiển thị lại các danh mục hải sản trên sàn.",
};

// Rendered behind a client-side sign-in check, so there is no instant shell to validate.
export const instant = false;

export default function AdminCategoriesPage() {
  return <AdminCategoriesView />;
}
