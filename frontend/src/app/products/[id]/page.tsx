import { ProductDetailPage } from "@/features/product/components/ProductDetailPage";
import { Metadata } from "next";
import { Suspense } from "react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Chi Tiết Hải Sản Tươi Sống - HaiSanExpress",
  description: "Mua hải sản tươi sống trực tiếp từ vựa uy tín. Đóng thùng oxy giao hỏa tốc 2 giờ.",
};

export default function Page({ params }: PageProps) {
  return (
    <Suspense>
      <ProductDetailRoute params={params} />
    </Suspense>
  );
}

async function ProductDetailRoute({ params }: PageProps) {
  const { id } = await params;
  return <ProductDetailPage productId={id} />;
}
