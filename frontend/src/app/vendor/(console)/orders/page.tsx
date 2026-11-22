import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { VendorOrdersView } from "@/features/vendor/components/VendorOrdersView";

export const metadata = {
  title: "Quản lý đơn hàng | HaiSan Express",
  description: "Theo dõi và xử lý các đơn hàng của gian hàng.",
};

// Rendered behind a client-side sign-in check, so there is no instant shell to validate.
export const instant = false;

/** The status tab is read from the URL, so the list renders inside Suspense (Cache Components). */
export default function VendorOrdersPage() {
  return (
    <Suspense
      fallback={
        <p className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500" role="status">
          <Loader2 className="h-5 w-5 animate-spin text-brand motion-reduce:animate-none" aria-hidden="true" />
          Đang tải đơn hàng...
        </p>
      }
    >
      <VendorOrdersView />
    </Suspense>
  );
}
