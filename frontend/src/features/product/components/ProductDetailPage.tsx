"use client";

import { useEffect, useState } from "react";
import { ProductDetail } from "../types/product.types";
import { getProductDetail } from "../api/product.api";
import { ProductBreadcrumb } from "./ProductBreadcrumb";
import { ProductImagesGallery } from "./ProductImagesGallery";
import { ProductPurchaseBox } from "./ProductPurchaseBox";
import { SellerStoreCard } from "./SellerStoreCard";
import { ProductTechnicalSpecs } from "./ProductTechnicalSpecs";
import { ProductReviewsSection } from "./ProductReviewsSection";
import { ProductAIChefAssistant } from "./ProductAIChefAssistant";
import { ColdChainStandardCard } from "./ColdChainStandardCard";
import { RelatedVendorProducts } from "./RelatedVendorProducts";
import { CustomerHeader } from "@/components/shared/CustomerHeader";
import { CustomerFooter } from "@/components/shared/CustomerFooter";
import { useCart } from "@/features/cart/context/CartContext";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";

interface ProductDetailPageProps {
  productId: string;
}

export function ProductDetailPage({ productId }: ProductDetailPageProps) {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const { toastMessage, clearToast } = useCart();

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setLoading(true);
      const data = await getProductDetail(productId);
      if (mounted) {
        setProduct(data);
        setLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, [productId]);

  if (loading || !product) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <CustomerHeader />
        <main className="flex-1 flex items-center justify-center py-20">
          <div className="text-center space-y-3">
            <div className="h-10 w-10 border-4 border-[#0F3860] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-500">
              Đang tải thông tin hải sản tươi sống từ vựa...
            </p>
          </div>
        </main>
        <CustomerFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/40 flex flex-col">
      {/* 1. Global Header */}
      <CustomerHeader />

      {/* 2. Breadcrumbs */}
      <ProductBreadcrumb product={product} />

      {/* Discontinued / Out of Stock Warning Banner if applicable */}
      {product.isDiscontinued && (
        <div className="bg-rose-600 text-white py-2.5 px-4 text-center text-xs font-bold flex items-center justify-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          <span>
            Sản phẩm này hiện đã ngừng kinh doanh hoặc tạm ngừng khai thác để bảo tồn nguồn lợi thủy sản tự nhiên.
          </span>
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
            <ProductImagesGallery
              images={product.images}
              productName={product.name}
            />
          </div>

          <div className="lg:col-span-7">
            <ProductPurchaseBox product={product} />
          </div>
        </section>

        {/* Middle Section: Seller Store Card */}
        <section>
          <SellerStoreCard vendor={product.vendor} />
        </section>

        {/* Lower Section: Specifications, AI Chef, Cold Chain & Reviews */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column (8 cols): Tech Specs & Customer Reviews */}
          <div className="lg:col-span-8 space-y-8">
            <ProductTechnicalSpecs specs={product.specifications} />
            <ProductReviewsSection summary={product.reviewsSummary} />
          </div>

          {/* Right Column (4 cols): AI Chef & Cold Chain Standard */}
          <div className="lg:col-span-4 space-y-6">
            <ProductAIChefAssistant />
            <ColdChainStandardCard />
          </div>
        </section>

        {/* Bottom Section: Related Vendor Products */}
        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <RelatedVendorProducts
            products={product.relatedProducts}
            vendorName={product.vendor.name}
            vendorSlug={product.vendor.slug}
          />
        </section>
      </main>

      {/* 4. Global Footer */}
      <CustomerFooter />
    </div>
  );
}
