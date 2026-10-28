import { ProductDetailPage } from "@/features/product/components/ProductDetailPage";
import { Metadata } from "next";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Chi Tiết Hải Sản Tươi Sống - HaiSanExpress`,
    description: `Mua hải sản tươi sống trực tiếp từ vựa uy tín. Đóng thùng oxy giao hỏa tốc 2 giờ.`,
  };
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <ProductDetailPage productId={id} />;
}
