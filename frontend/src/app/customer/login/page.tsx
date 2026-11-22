import { Metadata } from "next";
import { LoginForm } from "@/features/auth/components/LoginForm";

export const metadata: Metadata = {
  title: "Đăng nhập tài khoản khách hàng | HaiSan Express",
  description:
    "Đăng nhập tài khoản để khám phá và đặt mua hải sản tươi sống trực tiếp từ các vựa uy tín.",
};

export default function CustomerLoginPage() {
  return <LoginForm />;
}
