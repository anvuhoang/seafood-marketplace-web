import { Metadata } from "next";
import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Đặt lại mật khẩu | HaiSan Express",
  description: "Chọn mật khẩu mới cho tài khoản của bạn.",
  // The address carries a secret token: keep it out of search engines and out of the Referer header.
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
