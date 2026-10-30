import type { Metadata } from "next";
import { CatalogRoute } from "@/features/catalog/components/CatalogRoute";

export const metadata: Metadata = {
  title: "Hải Sản Theo Danh Mục - HaiSanExpress",
  description: "Hải sản tươi sống theo từng danh mục, mua trực tiếp từ vựa uy tín.",
};

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default function CategoryPage({ params, searchParams }: CategoryPageProps) {
  return (
    <CatalogRoute
      searchParams={searchParams}
      categorySlug={params.then(({ slug }) => slug)}
    />
  );
}
