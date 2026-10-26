import { Metadata } from "next";
import { RegisterForm } from "@/features/auth/components/RegisterForm";

export const metadata: Metadata = {
  title: "Đăng ký tài khoản khách hàng | HaiSan Express",
  description:
    "Đăng ký tài khoản HaiSan Express để nhận ưu đãi và mua hải sản tươi sống chất lượng cao giao nhanh trong 2h.",
};

export default function CustomerRegisterPage() {
  return <RegisterForm />;
}
