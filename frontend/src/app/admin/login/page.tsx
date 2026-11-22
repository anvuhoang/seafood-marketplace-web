import { Suspense } from "react";
import type { Metadata } from "next";
import { AdminLoginForm } from "@/features/admin/components/AdminLoginForm";

export const metadata: Metadata = {
  title: "Đăng nhập quản trị | HaiSan Express",
  // The admin sign-in should not show up in search results.
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  // The form reads ?redirect=, which needs Suspense while the page is prerendered.
  return (
    <Suspense>
      <AdminLoginForm />
    </Suspense>
  );
}
