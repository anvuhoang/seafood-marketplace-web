"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ImageIcon,
  Loader2,
  Package,
  PackageCheck,
  PackageX,
  PauseCircle,
  Pencil,
  PlayCircle,
  Plus,
  Search,
  TriangleAlert,
} from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { getCategories } from "@/features/category/api/category.api";
import { cn } from "@/lib/utils";
import { changeOfferStatus, listMyOffers } from "../api/vendor-product.api";
import { useMyStore } from "../hooks/useMyStore";
import type { VendorCategoryRef, VendorOffer, VendorOfferList, VendorOfferStatus } from "../types/vendor-product.types";
import { OFFER_STATUS_BADGES, STATUS_FILTERS, formatQuantity, formatVnd } from "../utils/vendor-product-form";
import { DiscontinueOfferDialog, EditOfferDialog } from "./OfferDialogs";
import { VendorPageHeader } from "./VendorPageHeader";
import { fieldClass } from "./VendorDialog";

const PAGE_SIZE = 10;

type Loaded = { key: string; list: VendorOfferList } | { key: string; error: string };
type Dialog = { kind: "edit" | "discontinue"; offer: VendorOffer } | null;

/** The vendor's products, prices and stock, with filters and per-row actions. */
export function VendorProductsView() {
  const { accessToken } = useAuth();
  const { state: storeState } = useMyStore();
  const store = storeState.kind === "ready" ? storeState.store : null;
  const readOnly = store ? store.status === "SUSPENDED" || store.status === "REJECTED" : false;

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<VendorOfferStatus | "">("");
  const [categoryId, setCategoryId] = useState("");
  const [page, setPage] = useState(1);
  const [reloadCount, setReloadCount] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [categories, setCategories] = useState<VendorCategoryRef[]>([]);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const key = JSON.stringify({ search, status, categoryId, page, reloadCount });
  const loading = !loaded || loaded.key !== key;

  // Wait for typing to pause before searching; a new search starts on page 1.
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
    if (!accessToken) return;
    let current = true;
    listMyOffers(accessToken, {
      search: search || undefined,
      status: status || undefined,
      categoryId: categoryId || undefined,
      page,
      pageSize: PAGE_SIZE,
    })
      .then((list) => current && setLoaded({ key, list }))
      .catch((error: unknown) =>
        current && setLoaded({ key, error: error instanceof Error ? error.message : "Không thể tải danh sách sản phẩm." }),
      );
    return () => {
      current = false;
    };
  }, [accessToken, key, search, status, categoryId, page]);

  useEffect(() => {
    let current = true;
    getCategories()
      .then((list) => current && setCategories(list.map(({ id, name }) => ({ id, name }))))
      .catch(() => current && setCategories([]));
    return () => {
      current = false;
    };
  }, []);

  const list = loaded && "list" in loaded ? loaded.list : null;
  const reload = () => setReloadCount((count) => count + 1);

  function afterSave(message: string) {
    setDialog(null);
    setNotice({ tone: "success", text: message });
    reload();
  }

  async function toggle(offer: VendorOffer) {
    if (!accessToken) return;
    const next = offer.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    setBusyId(offer.id);
    setNotice(null);
    try {
      await changeOfferStatus(accessToken, offer.id, next);
      setNotice({
        tone: "success",
        text: next === "PAUSED" ? `Đã tạm ngưng bán "${offer.product.name}".` : `Đã mở bán lại "${offer.product.name}".`,
      });
      reload();
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Không thể đổi trạng thái." });
    } finally {
      setBusyId(null);
    }
  }

  const filtersActive = Boolean(search || status || categoryId);

  return (
    <>
      <VendorPageHeader
        title="Quản lý sản phẩm gian hàng"
        description="Theo dõi sản phẩm, giá bán và tồn kho của gian hàng."
        actions={
          !readOnly && (
            <Link
              href="/vendor/products/new"
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Thêm sản phẩm
            </Link>
          )
        }
      />

      {readOnly && (
        <Note tone="slate" title="Gian hàng chỉ có thể xem">
          Gian hàng đang {store?.status === "SUSPENDED" ? "bị tạm ngưng" : "bị từ chối"} nên bạn không thể thêm hay thay đổi sản
          phẩm. Vui lòng liên hệ quản trị viên.
        </Note>
      )}
      {store?.status === "PENDING" && (
        <Note tone="amber" title="Gian hàng đang chờ duyệt">
          Bạn có thể chuẩn bị sản phẩm trước. Khách hàng chỉ thấy sản phẩm sau khi gian hàng được duyệt.
        </Note>
      )}

      <SummaryCards list={list} />

      <section className="mt-5 min-w-0 rounded-2xl border border-slate-200 bg-white" aria-labelledby="offer-list-title">
        <h2 id="offer-list-title" className="sr-only">
          Danh sách sản phẩm
        </h2>
        <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-4 md:grid-cols-[minmax(0,1fr)_200px_200px]">
          <label className="relative block min-w-0">
            <span className="sr-only">Tìm sản phẩm</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Tìm theo tên sản phẩm, biến thể, danh mục"
              className={fieldClass(false, "pl-9")}
            />
          </label>
          <label className="block min-w-0">
            <span className="sr-only">Lọc theo trạng thái</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as VendorOfferStatus | "");
                setPage(1);
              }}
              className={fieldClass(false)}
            >
              {STATUS_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-0">
            <span className="sr-only">Lọc theo danh mục</span>
            <select
              value={categoryId}
              onChange={(event) => {
                setCategoryId(event.target.value);
                setPage(1);
              }}
              className={fieldClass(false)}
            >
              <option value="">Tất cả danh mục</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {notice && (
          <p
            role={notice.tone === "error" ? "alert" : "status"}
            className={cn(
              "mx-4 mt-4 flex items-start gap-2 rounded-lg border p-3 text-sm",
              notice.tone === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800",
            )}
          >
            {notice.tone === "error" ? (
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            {notice.text}
          </p>
        )}

        {loaded && "error" in loaded && !loading ? (
          <div role="alert" className="m-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <p className="font-semibold">Không thể tải danh sách sản phẩm</p>
            <p className="mt-1">{loaded.error}</p>
            <button type="button" onClick={reload} className="mt-3 font-semibold underline">
              Thử lại
            </button>
          </div>
        ) : !list ? (
          <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500" role="status">
            <Loader2 className="h-5 w-5 animate-spin text-brand motion-reduce:animate-none" aria-hidden="true" />
            Đang tải sản phẩm...
          </div>
        ) : list.items.length === 0 ? (
          <EmptyState filtered={filtersActive} total={list.summary.total} readOnly={readOnly} />
        ) : (
          <div className={cn("transition-opacity motion-reduce:transition-none", loading && "opacity-60")} aria-busy={loading}>
            <OfferTable
              offers={list.items}
              threshold={list.summary.lowStockThreshold}
              readOnly={readOnly}
              busyId={busyId}
              onEdit={(offer) => setDialog({ kind: "edit", offer })}
              onToggle={toggle}
              onDiscontinue={(offer) => setDialog({ kind: "discontinue", offer })}
            />
            <Pager
              page={list.pagination.page}
              totalPages={list.pagination.totalPages}
              totalItems={list.pagination.totalItems}
              onPage={setPage}
            />
          </div>
        )}
      </section>

      {dialog && accessToken && dialog.kind === "edit" && (
        <EditOfferDialog
          token={accessToken}
          offer={dialog.offer}
          onClose={() => setDialog(null)}
          onSaved={(offer) => afterSave(`Đã cập nhật giá và tồn kho "${offer.product.name}".`)}
        />
      )}
      {dialog && accessToken && dialog.kind === "discontinue" && (
        <DiscontinueOfferDialog
          token={accessToken}
          offer={dialog.offer}
          onClose={() => setDialog(null)}
          onSaved={(offer) => afterSave(`Đã ngừng bán "${offer.product.name} · ${offer.variant.name}".`)}
        />
      )}
    </>
  );
}

function Note({ tone, title, children }: { tone: "amber" | "slate"; title: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "mb-4 flex gap-3 rounded-2xl border p-4 text-sm",
        tone === "amber" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-slate-300 bg-slate-100 text-slate-800",
      )}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5">{children}</p>
      </div>
    </div>
  );
}

function SummaryCards({ list }: { list: VendorOfferList | null }) {
  const summary = list?.summary;
  const cards = [
    { label: "Tổng sản phẩm", value: summary?.total, icon: Package, tone: "text-brand bg-brand-soft/40" },
    { label: "Đang bán", value: summary?.active, icon: PackageCheck, tone: "text-emerald-700 bg-emerald-50" },
    { label: "Tạm ngưng", value: summary?.paused, icon: PauseCircle, tone: "text-amber-700 bg-amber-50" },
    {
      label: `Sắp hết (≤ ${summary?.lowStockThreshold ?? 5})`,
      value: summary?.lowStock,
      icon: TriangleAlert,
      tone: "text-orange-700 bg-orange-50",
    },
    { label: "Đã ngừng bán", value: summary?.discontinued, icon: PackageX, tone: "text-rose-700 bg-rose-50" },
    { label: "Chờ duyệt", value: summary?.pendingApproval, icon: Clock, tone: "text-sky-700 bg-sky-50" },
  ];
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6" aria-label="Thống kê sản phẩm">
      {cards.map(({ label, value, icon: Icon, tone }) => (
        <li key={label} className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", tone)}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xl font-bold tabular-nums text-slate-900">{value ?? "–"}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyState({ filtered, total, readOnly }: { filtered: boolean; total: number; readOnly: boolean }) {
  return (
    <div className="px-6 py-14 text-center">
      <Package className="mx-auto h-10 w-10 text-slate-300" aria-hidden="true" />
      <p className="mt-3 text-base font-bold text-slate-900">
        {filtered ? "Không có sản phẩm phù hợp" : total > 0 ? "Chỉ còn sản phẩm đã ngừng bán" : "Gian hàng chưa có sản phẩm"}
      </p>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
        {filtered
          ? "Thử đổi từ khóa hoặc bộ lọc."
          : total > 0
            ? 'Chọn bộ lọc "Đã ngừng bán" để xem lại các sản phẩm này.'
            : "Thêm sản phẩm có sẵn trong danh mục chung hoặc đề xuất sản phẩm mới."}
      </p>
      {!filtered && !readOnly && (
        <Link
          href="/vendor/products/new"
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Thêm sản phẩm
        </Link>
      )}
    </div>
  );
}

interface OfferTableProps {
  offers: VendorOffer[];
  threshold: number;
  readOnly: boolean;
  busyId: string | null;
  onEdit: (offer: VendorOffer) => void;
  onToggle: (offer: VendorOffer) => void;
  onDiscontinue: (offer: VendorOffer) => void;
}

/** A table from md up; stacked cards below, so nothing scrolls sideways on phones. */
function OfferTable(props: OfferTableProps) {
  return (
    <>
      <div className="hidden md:block">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500">
            <tr>
              <th scope="col" className="w-[38%] px-4 py-3">
                Sản phẩm
              </th>
              <th scope="col" className="hidden w-[14%] px-3 py-3 xl:table-cell">
                Danh mục
              </th>
              <th scope="col" className="w-[15%] px-3 py-3 text-right">
                Giá bán
              </th>
              <th scope="col" className="w-[12%] px-3 py-3 text-right">
                Tồn kho
              </th>
              <th scope="col" className="w-[13%] px-3 py-3">
                Trạng thái
              </th>
              <th scope="col" className="w-[22%] px-4 py-3 text-right">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {props.offers.map((offer) => (
              <tr key={offer.id} className="align-top">
                <td className="px-4 py-3">
                  <ProductCell offer={offer} />
                </td>
                <td className="hidden px-3 py-3 text-slate-600 xl:table-cell">
                  {offer.product.categories.map((category) => category.name).join(", ") || "—"}
                </td>
                <td className="px-3 py-3 text-right font-semibold tabular-nums text-slate-900">
                  {formatVnd(offer.price)}
                  <span className="block text-xs font-normal text-slate-500">/ {offer.variant.unit}</span>
                </td>
                <td className="px-3 py-3 text-right">
                  <StockCell offer={offer} threshold={props.threshold} />
                </td>
                <td className="px-3 py-3">
                  <StatusBadge status={offer.status} />
                </td>
                <td className="px-4 py-3">
                  <RowActions offer={offer} {...props} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-slate-100 md:hidden">
        {props.offers.map((offer) => (
          <li key={offer.id} className="space-y-3 p-4">
            <ProductCell offer={offer} />
            <dl className="grid grid-cols-3 gap-2 text-sm">
              <div className="min-w-0">
                <dt className="text-xs text-slate-500">Giá bán</dt>
                <dd className="font-semibold tabular-nums text-slate-900">{formatVnd(offer.price)}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-slate-500">Tồn kho</dt>
                <dd>
                  <StockCell offer={offer} threshold={props.threshold} align="left" />
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs text-slate-500">Trạng thái</dt>
                <dd>
                  <StatusBadge status={offer.status} />
                </dd>
              </div>
            </dl>
            <RowActions offer={offer} {...props} align="left" />
          </li>
        ))}
      </ul>
    </>
  );
}

function ProductCell({ offer }: { offer: VendorOffer }) {
  const { product, variant } = offer;
  return (
    <div className="flex min-w-0 gap-3">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
        {product.imageUrl ? (
          // Cloudinary or seeded URLs; next/image is not configured for remote hosts.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-slate-300">
            <ImageIcon className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="font-semibold break-words text-slate-900">{product.name}</p>
        <p className="text-xs break-words text-slate-500">
          {variant.name}
          {variant.sizeLabel && ` · ${variant.sizeLabel}`} · Đơn vị: {variant.unit}
        </p>
        <div className="mt-1 flex flex-wrap gap-1">
          {product.status === "DRAFT" && (
            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-800 ring-1 ring-inset ring-sky-200">
              Chờ duyệt
            </span>
          )}
          {product.status === "INACTIVE" && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-inset ring-slate-300">
              Sản phẩm đã ẩn khỏi sàn
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function StockCell({ offer, threshold, align = "right" }: { offer: VendorOffer; threshold: number; align?: "left" | "right" }) {
  const stock = Number(offer.stock);
  const low = offer.status === "ACTIVE" && stock <= threshold;
  return (
    <span className={cn("block tabular-nums", align === "right" && "text-right")}>
      <span className={cn("font-semibold", stock === 0 ? "text-rose-700" : low ? "text-orange-700" : "text-slate-900")}>
        {formatQuantity(offer.stock)}
      </span>{" "}
      <span className="text-xs text-slate-500">{offer.variant.unit}</span>
      {stock === 0 ? (
        <span className="block text-xs font-semibold text-rose-700">Hết hàng</span>
      ) : (
        low && <span className="block text-xs font-semibold text-orange-700">Sắp hết</span>
      )}
    </span>
  );
}

function StatusBadge({ status }: { status: VendorOfferStatus }) {
  const badge = OFFER_STATUS_BADGES[status];
  return (
    <span className={cn("inline-block rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ring-1 ring-inset", badge.className)}>
      {badge.label}
    </span>
  );
}

function RowActions({
  offer,
  readOnly,
  busyId,
  onEdit,
  onToggle,
  onDiscontinue,
  align = "right",
}: OfferTableProps & { offer: VendorOffer; align?: "left" | "right" }) {
  if (readOnly || offer.status === "DISCONTINUED") {
    return (
      <p className={cn("text-xs text-slate-500", align === "right" && "text-right")}>
        {offer.status === "DISCONTINUED" ? "Đã ngừng bán, không thể thay đổi." : "Chỉ xem"}
      </p>
    );
  }
  const busy = busyId === offer.id;
  const button =
    "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
  return (
    <div className={cn("flex flex-wrap gap-1.5", align === "right" && "justify-end")}>
      <button type="button" onClick={() => onEdit(offer)} disabled={busy} className={cn(button, "border-slate-300 text-slate-700 hover:bg-slate-50")}>
        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        Giá, tồn kho
      </button>
      <button
        type="button"
        onClick={() => onToggle(offer)}
        disabled={busy}
        className={cn(button, "border-slate-300 text-slate-700 hover:bg-slate-50")}
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        ) : offer.status === "ACTIVE" ? (
          <PauseCircle className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <PlayCircle className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {offer.status === "ACTIVE" ? "Tạm ngưng" : "Mở bán"}
      </button>
      {offer.product.isOwnDraft && (
        <Link
          href={`/vendor/products/${offer.product.id}/edit`}
          className={cn(button, "border-slate-300 text-slate-700 hover:bg-slate-50")}
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          Sửa sản phẩm
        </Link>
      )}
      <button
        type="button"
        onClick={() => onDiscontinue(offer)}
        disabled={busy}
        className={cn(button, "border-rose-200 text-rose-700 hover:bg-rose-50")}
      >
        <Ban className="h-3.5 w-3.5" aria-hidden="true" />
        Ngừng bán
      </button>
    </div>
  );
}

function Pager({
  page,
  totalPages,
  totalItems,
  onPage,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  onPage: (page: number) => void;
}) {
  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm" aria-label="Phân trang">
      <p className="text-slate-500">
        {totalItems} sản phẩm · Trang {page}/{totalPages}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Trước
        </button>
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Sau
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
