"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, PackagePlus, Search } from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { cn } from "@/lib/utils";
import { createDraftProduct } from "../api/vendor-product.api";
import { useMyStore } from "../hooks/useMyStore";
import type { VendorOffer } from "../types/vendor-product.types";
import { emptyProductForm } from "../utils/vendor-product-form";
import type { ProductFormValues } from "../utils/vendor-product-form";
import { CatalogOfferPicker } from "./CatalogOfferPicker";
import { DraftProductForm } from "./DraftProductForm";
import { SmartImportPanel } from "./SmartImportPanel";
import { VendorPageHeader } from "./VendorPageHeader";

type Mode = "catalog" | "draft";

/** Add a product: sell an existing catalogue product, or propose a new one for approval. */
export function VendorProductNewView() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const { state } = useMyStore();
  const [mode, setMode] = useState<Mode>("catalog");
  const [created, setCreated] = useState<VendorOffer | null>(null);
  const [formSeed, setFormSeed] = useState<{ version: number; initial: ProductFormValues }>(() => ({
    version: 0,
    initial: emptyProductForm(),
  }));

  const store = state.kind === "ready" ? state.store : null;
  const readOnly = store?.status === "SUSPENDED" || store?.status === "REJECTED";

  const back = (
    <Link
      href="/vendor/products"
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Về danh sách
    </Link>
  );

  if (!accessToken || state.kind === "loading" || state.kind === "idle") {
    return (
      <>
        <VendorPageHeader title="Thêm sản phẩm" actions={back} />
        <p className="flex min-h-48 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm text-slate-500" role="status">
          <Loader2 className="h-5 w-5 animate-spin text-brand motion-reduce:animate-none" aria-hidden="true" />
          Đang tải...
        </p>
      </>
    );
  }

  if (!store || readOnly) {
    return (
      <>
        <VendorPageHeader title="Thêm sản phẩm" actions={back} />
        <p role="alert" className="rounded-2xl border border-slate-300 bg-slate-100 p-5 text-sm text-slate-800">
          {!store
            ? state.kind === "no-store"
              ? "Tài khoản của bạn chưa có gian hàng."
              : "Không thể tải thông tin gian hàng."
            : "Gian hàng đang bị tạm ngưng hoặc bị từ chối nên không thể thêm sản phẩm. Vui lòng liên hệ quản trị viên."}
        </p>
      </>
    );
  }

  if (created) {
    return (
      <>
        <VendorPageHeader title="Thêm sản phẩm" actions={back} />
        <section role="status" className="rounded-2xl border border-emerald-200 bg-white p-6 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" aria-hidden="true" />
          <h2 className="mt-3 text-base font-bold text-slate-900">Đã thêm vào gian hàng</h2>
          <p className="mt-1 text-sm text-slate-600">
            {created.product.name} · {created.variant.name}
          </p>
          <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => setCreated(null)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Thêm sản phẩm khác
            </button>
            <Link href="/vendor/products" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover">
              Xem danh sách sản phẩm
            </Link>
          </div>
        </section>
      </>
    );
  }

  const tabs: Array<{ value: Mode; label: string; description: string; icon: typeof Search }> = [
    { value: "catalog", label: "Bán sản phẩm có sẵn", description: "Chọn từ danh mục chung của sàn", icon: Search },
    { value: "draft", label: "Đề xuất sản phẩm mới", description: "Sàn chưa có, gửi để quản trị viên duyệt", icon: PackagePlus },
  ];

  return (
    <>
      <VendorPageHeader title="Thêm sản phẩm" description="Thêm hải sản vào gian hàng của bạn." actions={back} />

      <div role="tablist" aria-label="Cách thêm sản phẩm" className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {tabs.map(({ value, label, description, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="tab"
            id={`tab-${value}`}
            aria-selected={mode === value}
            aria-controls={`panel-${value}`}
            onClick={() => setMode(value)}
            className={cn(
              "flex min-w-0 items-start gap-3 rounded-2xl border p-4 text-left transition-colors",
              mode === value ? "border-brand bg-brand-soft/30 ring-1 ring-brand" : "border-slate-200 bg-white hover:bg-slate-50",
            )}
          >
            <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", mode === value ? "text-brand" : "text-slate-400")} aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-sm font-bold text-slate-900">{label}</span>
              <span className="block text-xs text-slate-500">{description}</span>
            </span>
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${mode}`} aria-labelledby={`tab-${mode}`}>
        {mode === "catalog" ? (
          <CatalogOfferPicker token={accessToken} onCreated={setCreated} />
        ) : (
          <>
            <SmartImportPanel
              token={accessToken}
              onApply={(values) => setFormSeed((seed) => ({ version: seed.version + 1, initial: values }))}
            />
            {/* A new key restarts the form from the AI draft; the vendor edits it and decides whether to submit. */}
            <DraftProductForm
              key={formSeed.version}
              mode="create"
              token={accessToken}
              initial={formSeed.initial}
              uploadEnabled={store.imageUploadEnabled}
              readOnly={false}
              submit={(input) => createDraftProduct(accessToken, input)}
              onSaved={() => router.push("/vendor/products")}
            />
          </>
        )}
      </div>
    </>
  );
}
