import { Metadata } from "next";
import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Quên mật khẩu | HaiSan Express",
  description: "Nhận đường dẫn đặt lại mật khẩu qua email.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
