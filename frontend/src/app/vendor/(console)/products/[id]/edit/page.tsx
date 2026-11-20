import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { VendorProductEditView } from "@/features/vendor/components/VendorProductEditView";

export const metadata = {
  title: "Sửa sản phẩm | HaiSan Express",
  description: "Chỉnh sửa sản phẩm do gian hàng đã tạo.",
};

/** The id is only known at request time, so it is read inside Suspense (Cache Components). */
interface EditPageProps {
  params: Promise<{ id: string }>;
}

export default function VendorEditProductPage({ params }: EditPageProps) {
  return (
    <Suspense
      fallback={
        <p className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500" role="status">
          <Loader2 className="h-5 w-5 animate-spin text-brand motion-reduce:animate-none" aria-hidden="true" />
          Đang tải sản phẩm...
        </p>
      }
    >
      <EditForId params={params} />
    </Suspense>
  );
}

async function EditForId({ params }: EditPageProps) {
  const { id } = await params;
  return <VendorProductEditView productId={id} />;
}
