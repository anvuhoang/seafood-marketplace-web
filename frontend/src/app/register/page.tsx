import { Metadata } from "next";
import { RegisterForm } from "@/features/auth/components/RegisterForm";

export const metadata: Metadata = {
  title: "Đăng ký | HaiSan Express",
  description: "Đăng ký tài khoản khách hàng HaiSan Express.",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
