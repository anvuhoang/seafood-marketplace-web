"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ApiError } from "@/features/auth/api/auth.api";
import { useAuth } from "@/features/auth/context/AuthContext";
import { getDraftProduct, updateDraftProduct } from "../api/vendor-product.api";
import type { VendorDraftProduct } from "../types/vendor-product.types";
import { draftToForm } from "../utils/vendor-product-form";
import { DraftProductForm } from "./DraftProductForm";
import { VendorPageHeader } from "./VendorPageHeader";

type Loaded =
  | { id: string; product: VendorDraftProduct }
  | { id: string; error: string; status?: number };

/** Edit a draft product the signed-in vendor proposed, while it waits for approval. */
export function VendorProductEditView({ productId }: { productId: string }) {
  const { accessToken } = useAuth();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [version, setVersion] = useState(0);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let current = true;
    getDraftProduct(accessToken, productId)
      .then((product) => current && setLoaded({ id: productId, product }))
      .catch(
        (error: unknown) =>
          current &&
          setLoaded({
            id: productId,
            error: error instanceof Error ? error.message : "Không thể tải sản phẩm.",
            status: error instanceof ApiError ? error.statusCode : undefined,
          }),
      );
    return () => {
      current = false;
    };
  }, [accessToken, productId]);

  const back = (
    <Link
      href="/vendor/products"
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Về danh sách
    </Link>
  );

  if (!accessToken || !loaded || loaded.id !== productId) {
    return (
      <>
        <VendorPageHeader title="Sửa sản phẩm" actions={back} />
        <p className="flex min-h-48 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm text-slate-500" role="status">
          <Loader2 className="h-5 w-5 animate-spin text-brand motion-reduce:animate-none" aria-hidden="true" />
          Đang tải sản phẩm...
        </p>
      </>
    );
  }

  if ("error" in loaded) {
    return (
      <>
        <VendorPageHeader title="Sửa sản phẩm" actions={back} />
        <section role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
          <h2 className="font-bold">
            {loaded.status === 409
              ? "Sản phẩm đã được duyệt"
              : loaded.status === 404
                ? "Không tìm thấy sản phẩm"
                : "Không thể tải sản phẩm"}
          </h2>
          <p className="mt-1">{loaded.error}</p>
        </section>
      </>
    );
  }

  const { product } = loaded;
  return (
    <>
      <VendorPageHeader
        title="Sửa sản phẩm"
        description={
          <>
            {product.name} ·{" "}
            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-800 ring-1 ring-inset ring-sky-200">
              Chờ duyệt
            </span>
          </>
        }
        actions={back}
      />
      {!product.editable && (
        <p role="alert" className="mb-4 rounded-2xl border border-slate-300 bg-slate-100 p-4 text-sm text-slate-800">
          Gian hàng đang bị tạm ngưng hoặc bị từ chối nên sản phẩm chỉ có thể xem.
        </p>
      )}
      <DraftProductForm
        // A fresh form after each save, so removed variants and new ids line up with the server.
        key={`${product.id}-${version}`}
        mode="edit"
        token={accessToken}
        initial={draftToForm(product)}
        initialCategories={product.categories}
        uploadEnabled={product.imageUploadEnabled}
        readOnly={!product.editable}
        submit={(input) => updateDraftProduct(accessToken, product.id, input)}
        onSaved={(saved) => {
          setLoaded({ id: productId, product: saved });
          setVersion((count) => count + 1);
          setSuccess("Đã lưu thay đổi sản phẩm.");
        }}
        success={success}
      />
    </>
  );
}
