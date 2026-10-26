import { Metadata } from "next";
import { LoginForm } from "@/features/auth/components/LoginForm";

export const metadata: Metadata = {
  title: "Đăng nhập | HaiSan Express",
  description: "Đăng nhập tài khoản khách hàng HaiSan Express.",
};

export default function LoginPage() {
  return <LoginForm />;
}
