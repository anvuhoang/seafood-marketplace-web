"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProductDetail } from "../types/product.types";
import { getProductDetail } from "../api/product.api";
import { ProductBreadcrumb } from "./ProductBreadcrumb";
import { ProductImagesGallery } from "./ProductImagesGallery";
import { ProductPurchaseBox } from "./ProductPurchaseBox";
import { SellerStoreCard } from "./SellerStoreCard";
import { ProductTechnicalSpecs } from "./ProductTechnicalSpecs";
import { ProductReviewsSection } from "./ProductReviewsSection";
import { ColdChainStandardCard } from "./ColdChainStandardCard";
import { RelatedVendorProducts } from "./RelatedVendorProducts";
import { CustomerHeader } from "@/components/shared/CustomerHeader";
import { CustomerFooter } from "@/components/shared/CustomerFooter";
import { useCart } from "@/features/cart/context/CartContext";
import { getProductListing } from "@/features/catalog/api/catalog.api";
import { ProductListingItem } from "@/features/catalog/types/catalog.types";
import { CheckCircle2, AlertTriangle, PackageSearch, X } from "lucide-react";

const RELATED_PRODUCT_LIMIT = 4;

interface ProductDetailPageProps {
  productId: string;
}

type LoadState =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "error" }
  | { status: "ready"; product: ProductDetail };

export function ProductDetailPage({ productId }: ProductDetailPageProps) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [related, setRelated] = useState<{ items: ProductListingItem[]; total: number }>({
    items: [],
    total: 0,
  });
  const { toastMessage, clearToast } = useCart();

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setState({ status: "loading" });
      setRelated({ items: [], total: 0 });

      let product: ProductDetail | null;
      try {
        product = await getProductDetail(productId);
      } catch (error) {
        console.error("Failed to load product detail:", error);
        if (mounted) setState({ status: "error" });
        return;
      }

      if (!mounted) return;
      if (!product) {
        setState({ status: "not-found" });
        return;
      }
      setState({ status: "ready", product });

      // Other products from the same vendor; the page works without them.
      if (product.vendor) {
        try {
          const listing = await getProductListing({
            q: "",
            categories: [],
            regions: [],
            vendors: [product.vendor.slug],
            inStock: false,
            sort: "featured",
            page: 1,
            view: "grid",
          });
          const others = listing.items.filter((item) => item.id !== product.id);
          if (mounted) {
            setRelated({
              items: others.slice(0, RELATED_PRODUCT_LIMIT),
              total: Math.max(0, listing.pagination.totalItems - 1),
            });
          }
        } catch (error) {
          console.error("Failed to load related products:", error);
        }
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, [productId]);

  if (state.status !== "ready") {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <CustomerHeader />
        <main className="flex-1 flex items-center justify-center px-4 py-20">
          {state.status === "loading" ? (
            <div className="text-center space-y-3" role="status">
              <div className="h-10 w-10 border-4 border-[#0F3860] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-500">
                Đang tải thông tin hải sản tươi sống từ vựa...
              </p>
            </div>
          ) : (
            <div
              role={state.status === "error" ? "alert" : "status"}
              className="flex max-w-md flex-col items-center text-center"
            >
              {state.status === "error" ? (
                <AlertTriangle className="h-10 w-10 text-rose-500" />
              ) : (
                <PackageSearch className="h-10 w-10 text-slate-300" />
              )}
              <h1 className="mt-3 text-lg font-black text-slate-900">
                {state.status === "error" ? "Không thể tải sản phẩm" : "Không tìm thấy sản phẩm"}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {state.status === "error"
                  ? "Đã có lỗi khi kết nối tới máy chủ. Vui lòng thử lại sau ít phút."
                  : "Sản phẩm này không tồn tại hoặc chưa được mở bán."}
              </p>
              <Link
                href="/products"
                className="mt-5 rounded-xl bg-[#0F3860] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#0A2744]"
              >
                Xem hải sản khác
              </Link>
            </div>
          )}
        </main>
        <CustomerFooter />
      </div>
    );
  }

  const { product } = state;
  const hasSpecs = Object.values(product.specifications).some(Boolean);

  return (
    <div className="min-h-screen bg-slate-50/40 flex flex-col">
      {/* 1. Global Header */}
      <CustomerHeader />

      {/* 2. Breadcrumbs */}
      <ProductBreadcrumb product={product} />

      {/* Discontinued Warning Banner if applicable */}
      {product.isDiscontinued && (
        <div className="bg-rose-600 text-white py-2.5 px-4 text-center text-xs font-bold flex items-center justify-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          <span>Sản phẩm này hiện đã ngừng kinh doanh.</span>
        </div>
      )}

      {/* Toast Notification for Cart Actions */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-4 py-3 shadow-xl border border-slate-700 animate-slide-up">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <p className="text-xs font-medium pr-2">{toastMessage}</p>
          <button
            type="button"
            onClick={clearToast}
            className="rounded-lg p-1 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 3. Main Content Container */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Section: Gallery & Purchase Box */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs">
          <div className="lg:col-span-5">
            <ProductImagesGallery images={product.images} productName={product.name} />
          </div>

          <div className="lg:col-span-7">
            <ProductPurchaseBox product={product} />
          </div>
        </section>

        {/* Middle Section: Seller Store Card */}
        {product.vendor && (
          <section>
            <SellerStoreCard vendor={product.vendor} />
          </section>
        )}

        {/* Lower Section: Description, Specifications, Reviews & Cold Chain */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            {product.description && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <h2 className="text-base font-bold text-slate-900">Mô Tả Sản Phẩm</h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                  {product.description}
                </p>
              </div>
            )}
            {hasSpecs && <ProductTechnicalSpecs specs={product.specifications} />}
            <ProductReviewsSection summary={product.reviewsSummary} />
          </div>

          <div className="lg:col-span-4 space-y-6">
            <ColdChainStandardCard />
          </div>
        </section>

        {/* Bottom Section: Related Vendor Products */}
        {product.vendor && related.items.length > 0 && (
          <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <RelatedVendorProducts
              products={related.items}
              totalCount={related.total}
              vendorName={product.vendor.name}
              vendorSlug={product.vendor.slug}
            />
          </section>
        )}
      </main>

      {/* 4. Global Footer */}
      <CustomerFooter />
    </div>
  );
}
