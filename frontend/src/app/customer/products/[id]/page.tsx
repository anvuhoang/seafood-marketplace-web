import { ProductDetailPage } from "@/features/product/components/ProductDetailPage";
import { Metadata } from "next";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Chi Tiết Sản Phẩm Hải Sản - HaiSanExpress`,
    description: `Thông tin hải sản tươi sống bơi hồ, cam kết chất lượng chuẩn sạch.`,
  };
}

export default async function CustomerProductPage({ params }: PageProps) {
  const { id } = await params;
  return <ProductDetailPage productId={id} />;
}
