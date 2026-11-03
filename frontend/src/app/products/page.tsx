import type { Metadata } from "next";
import { CatalogRoute } from "@/features/catalog/components/CatalogRoute";

export const metadata: Metadata = {
  title: "Tất Cả Hải Sản - HaiSanExpress",
  description: "Hải sản tươi sống từ nhiều vựa uy tín, lọc theo loại, ngư trường, mức giá và vựa.",
};

interface ProductsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default function ProductsPage({ searchParams }: ProductsPageProps) {
  return <CatalogRoute searchParams={searchParams} />;
}
