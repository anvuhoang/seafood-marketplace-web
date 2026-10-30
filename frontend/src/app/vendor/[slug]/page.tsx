import { notFound } from "next/navigation";
import { CustomerHeader } from "@/components/shared/CustomerHeader";
import { CustomerFooter } from "@/components/shared/CustomerFooter";
import { getVendorStorefront } from "@/features/vendor/api/vendor.api";
import { VendorStorefrontView } from "@/features/vendor/components/VendorStorefrontView";

// Block on the storefront lookup so a missing vendor returns a real 404
// instead of a streamed 200 with a not-found UI.
export const instant = false;

interface VendorPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ category?: string | string[] }>;
}

export default async function VendorStorefrontPage({
  params,
  searchParams,
}: VendorPageProps) {
  const { slug } = await params;
  const { category } = await searchParams;
  const categorySlug = typeof category === "string" ? category : undefined;

  let storefront;

  try {
    storefront = await getVendorStorefront(slug, categorySlug);
  } catch (error) {
    console.error("Failed to load vendor storefront:", error);
    storefront = undefined;
  }

  // Resolve 404 before rendering so the response status is correct.
  if (storefront === null) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50/40 flex flex-col">
      <CustomerHeader />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8">
        {storefront ? (
          <VendorStorefrontView storefront={storefront} activeCategory={categorySlug} />
        ) : (
          <p className="py-20 text-center text-sm text-slate-500">
            Không thể tải gian hàng lúc này. Vui lòng thử lại sau.
          </p>
        )}
      </main>

      <CustomerFooter />
    </div>
  );
}
