import { notFound, unstable_rethrow } from "next/navigation";
import { CustomerHeader } from "@/components/shared/CustomerHeader";
import { CustomerFooter } from "@/components/shared/CustomerFooter";
import { getVendorStorefront } from "@/features/vendor/api/vendor.api";
import { VendorStorefrontView } from "@/features/vendor/components/VendorStorefrontView";
import { parseStorefrontQuery } from "@/features/vendor/utils/storefront-query";

// The page blocks on the storefront lookup. With Partial Prerendering the
// shell is already sent in production, so a missing vendor renders the
// not-found UI with status 200 and a noindex tag (a real 404 in `next dev`).
export const instant = false;

interface VendorPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function VendorStorefrontPage({
  params,
  searchParams,
}: VendorPageProps) {
  const { slug } = await params;
  const query = parseStorefrontQuery(await searchParams);

  let storefront;

  try {
    storefront = await getVendorStorefront(slug, query.category);
  } catch (error) {
    // Let Next.js prerender interrupts through; only real failures are handled here.
    unstable_rethrow(error);
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
          <VendorStorefrontView storefront={storefront} query={query} />
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
