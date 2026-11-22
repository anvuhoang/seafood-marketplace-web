"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, ImageIcon, Loader2, Search } from "lucide-react";
import { ApiError } from "@/features/auth/api/auth.api";
import { cn } from "@/lib/utils";
import { createOffer, searchCatalog } from "../api/vendor-product.api";
import type { VendorCatalogList, VendorCatalogProduct, VendorCatalogVariant, VendorOffer } from "../types/vendor-product.types";
import { mapOfferMessages, validatePrice, validateStock } from "../utils/vendor-product-form";
import type { OfferFormErrors } from "../utils/vendor-product-form";
import { OfferAmountField } from "./OfferAmountField";
import { dialogButton, fieldClass } from "./VendorDialog";

const PAGE_SIZE = 8;

type Loaded = { key: string; list: VendorCatalogList } | { key: string; error: string };
type Selection = { product: VendorCatalogProduct; variant: VendorCatalogVariant };

/** Find a product in the shared catalogue, pick a variant, then set price and stock. */
export function CatalogOfferPicker({ token, onCreated }: { token: string; onCreated: (offer: VendorOffer) => void }) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);

  const key = JSON.stringify({ search, page });
  const loading = !loaded || loaded.key !== key;

  useEffect(() => {
    const next = searchInput.trim();
    if (next === search) return;
    const timer = window.setTimeout(() => {
      setSearch(next);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput, search]);

  useEffect(() => {
    let current = true;
    searchCatalog(token, { search: search || undefined, page, pageSize: PAGE_SIZE })
      .then((list) => current && setLoaded({ key, list }))
      .catch((error: unknown) =>
        current && setLoaded({ key, error: error instanceof Error ? error.message : "Không thể tải danh mục sản phẩm." }),
      );
    return () => {
      current = false;
    };
  }, [token, key, search, page]);

  const list = loaded && "list" in loaded ? loaded.list : null;

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white" aria-labelledby="catalog-title">
        <div className="border-b border-slate-100 p-4">
          <h2 id="catalog-title" className="text-base font-bold text-slate-900">
            1. Chọn sản phẩm và biến thể
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Gồm các sản phẩm đã có trên sàn, kể cả sản phẩm do bạn tạo.
          </p>
          <label className="relative mt-3 block">
            <span className="sr-only">Tìm sản phẩm trong danh mục chung</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Tìm theo tên sản phẩm, loài, danh mục"
              className={fieldClass(false, "pl-9")}
            />
          </label>
        </div>

        {loaded && "error" in loaded && !loading ? (
          <p role="alert" className="m-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {loaded.error}
          </p>
        ) : !list ? (
          <p className="flex min-h-40 items-center justify-center gap-2 text-sm text-slate-500" role="status">
            <Loader2 className="h-5 w-5 animate-spin text-brand motion-reduce:animate-none" aria-hidden="true" />
            Đang tìm sản phẩm...
          </p>
        ) : list.items.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-slate-500">
            Không tìm thấy sản phẩm phù hợp. Nếu sàn chưa có, hãy chọn &quot;Tạo sản phẩm mới&quot;.
          </p>
        ) : (
          <div className={cn("transition-opacity motion-reduce:transition-none", loading && "opacity-60")} aria-busy={loading}>
            <ul className="divide-y divide-slate-100">
              {list.items.map((product) => (
                <li key={product.id} className="flex min-w-0 gap-3 p-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-slate-300">
                        <ImageIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold break-words text-slate-900">
                      {product.name}
                      {product.isOwnProduct && (
                        <span className="ml-2 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-800 ring-1 ring-inset ring-sky-200">
                          Sản phẩm bạn tạo
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">{product.categories.map((category) => category.name).join(", ")}</p>
                    <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label={`Biến thể của ${product.name}`}>
                      {product.variants.map((variant) => {
                        const selected = selection?.variant.id === variant.id;
                        return (
                          <button
                            key={variant.id}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            disabled={variant.alreadyOffered}
                            onClick={() => setSelection({ product, variant })}
                            className={cn(
                              "rounded-lg border px-3 py-1.5 text-left text-xs transition-colors disabled:cursor-not-allowed",
                              selected
                                ? "border-brand bg-brand-soft/40 font-semibold text-brand"
                                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-400",
                            )}
                          >
                            {variant.name}
                            {variant.sizeLabel && ` · ${variant.sizeLabel}`} · {variant.unit}
                            {variant.alreadyOffered && <span className="block text-[11px]">Gian hàng đã có</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <nav className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 text-sm" aria-label="Phân trang danh mục">
              <span className="text-slate-500">
                Trang {list.pagination.page}/{list.pagination.totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage(page - 1)}
                  disabled={list.pagination.page <= 1}
                  aria-label="Trang trước"
                  className="rounded-lg border border-slate-300 p-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage(page + 1)}
                  disabled={list.pagination.page >= list.pagination.totalPages}
                  aria-label="Trang sau"
                  className="rounded-lg border border-slate-300 p-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </nav>
          </div>
        )}
      </section>

      <OfferForm key={selection?.variant.id ?? "none"} token={token} selection={selection} onCreated={onCreated} />
    </div>
  );
}

function OfferForm({ token, selection, onCreated }: { token: string; selection: Selection | null; onCreated: (offer: VendorOffer) => void }) {
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "PAUSED">("ACTIVE");
  const [errors, setErrors] = useState<OfferFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selection) return;
    const parsedPrice = validatePrice(price);
    const parsedStock = validateStock(stock);
    setErrors({ price: parsedPrice.error, stock: parsedStock.error });
    setFormError(null);
    if (parsedPrice.value === undefined || parsedStock.value === undefined) return;

    setSaving(true);
    try {
      onCreated(
        await createOffer(token, { variantId: selection.variant.id, price: parsedPrice.value, stock: parsedStock.value, status }),
      );
    } catch (error) {
      if (error instanceof ApiError) {
        const { fields, other } = mapOfferMessages(error.messages);
        setErrors(fields);
        setFormError(other.join(" ") || (Object.keys(fields).length ? null : error.message));
      } else {
        setFormError("Không thể thêm sản phẩm. Vui lòng thử lại.");
      }
      setSaving(false);
    }
  }

  return (
    <section className="min-w-0 self-start rounded-2xl border border-slate-200 bg-white p-4 lg:sticky lg:top-24" aria-labelledby="offer-form-title">
      <h2 id="offer-form-title" className="text-base font-bold text-slate-900">
        2. Giá bán và tồn kho
      </h2>
      {!selection ? (
        <p className="mt-2 text-sm text-slate-500">Chọn một biến thể ở danh sách bên cạnh để nhập giá bán.</p>
      ) : (
        <form noValidate onSubmit={handleSubmit} className="mt-3 space-y-4">
          <p className="flex gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
            <span className="min-w-0 break-words">
              <span className="font-semibold text-slate-900">{selection.product.name}</span> · {selection.variant.name}
              {selection.variant.sizeLabel && ` · ${selection.variant.sizeLabel}`} · Đơn vị: {selection.variant.unit}
            </span>
          </p>
          <OfferAmountField kind="price" value={price} error={errors.price} disabled={saving} onChange={setPrice} />
          <OfferAmountField
            kind="stock"
            value={stock}
            unit={selection.variant.unit}
            error={errors.stock}
            disabled={saving}
            onChange={setStock}
          />
          <fieldset>
            <legend className="text-sm font-semibold text-slate-800">Trạng thái ban đầu</legend>
            <div className="mt-1.5 flex flex-wrap gap-4 text-sm text-slate-700">
              {(["ACTIVE", "PAUSED"] as const).map((value) => (
                <label key={value} className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="offer-status"
                    value={value}
                    checked={status === value}
                    disabled={saving}
                    onChange={() => setStatus(value)}
                    className="h-4 w-4 accent-brand"
                  />
                  {value === "ACTIVE" ? "Đang bán" : "Tạm ngưng"}
                </label>
              ))}
            </div>
          </fieldset>
          {selection.product.status === "DRAFT" && (
            <p className="text-xs text-slate-500">Sản phẩm đang chờ duyệt: khách chỉ thấy giá này sau khi sản phẩm được duyệt.</p>
          )}
          {formError && (
            <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              {formError}
            </p>
          )}
          <button type="submit" disabled={saving} className={cn(dialogButton.primary, "w-full")}>
            {saving && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
            {saving ? "Đang thêm..." : "Thêm vào gian hàng"}
          </button>
        </form>
      )}
    </section>
  );
}
