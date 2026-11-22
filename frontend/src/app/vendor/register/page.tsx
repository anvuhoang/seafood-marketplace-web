import type { Metadata } from "next";
import { CustomerHeader } from "@/components/shared/CustomerHeader";
import { CustomerFooter } from "@/components/shared/CustomerFooter";
import { VendorRegistrationView } from "@/features/vendor-registration/components/VendorRegistrationView";

export const metadata: Metadata = {
  title: "Đăng ký mở gian hàng | HaiSan Express",
  description: "Gửi hồ sơ mở gian hàng hải sản trên HaiSan Express.",
};

/** Signed-out visitors are sent to the login page by proxy.ts before reaching this page. */
export default function VendorRegisterPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50/60">
      <CustomerHeader />
      <main className="w-full flex-1 px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <VendorRegistrationView />
      </main>
      <CustomerFooter />
    </div>
  );
}
