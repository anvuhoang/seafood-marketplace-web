"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, Loader2, Search, TriangleAlert } from "lucide-react";
import { AccountPageHeader } from "@/features/account/components/AccountShell";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useCart } from "@/features/cart/context/CartContext";
import { cn } from "@/lib/utils";
import { listMyOrders, reorderMyOrder } from "../api/customer-order.api";
import { ORDER_TABS, PAYMENT_FILTERS, PAYMENT_STATUS } from "../constants/order-status";
import type { CustomerOrderList, PaymentStatus, ReorderResult } from "../types/order.types";
import { errorMessage } from "../utils/order-format";
import { OrderHistoryCard } from "./OrderHistoryCard";

const PAGE_SIZE = 10;
const SEARCH_DELAY_MS = 350;

type Loaded = { key: string; list: CustomerOrderList } | { key: string; error: string };
type Banner = { tone: "success" | "warning" | "error"; text: string; notices: string[]; cart: boolean };

/**
 * The signed-in customer's orders, newest first, with a search, status tabs and "buy again".
 * It is shown inside the account area (see AccountShell), so it has no sidebar of its own.
 */
export function CustomerOrdersView() {
  const { accessToken } = useAuth();
  const { refresh: refreshCart } = useCart();
  const [tab, setTab] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | "">("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [reloadCount, setReloadCount] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [reordering, setReordering] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);

  const statuses = ORDER_TABS.find((item) => item.key === tab)?.statuses ?? [];
  const key = JSON.stringify({ tab, paymentStatus, query, page, reloadCount });
  const loading = !loaded || loaded.key !== key;

  // The search waits for a short pause in typing, so each key does not ask the server.
  useEffect(() => {
    const next = search.trim();
    if (next === query) return;
    const timer = setTimeout(() => {
      setQuery(next);
      setPage(1);
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [search, query]);

  useEffect(() => {
    if (!accessToken) return;
    let current = true;
    listMyOrders(accessToken, { status: statuses, q: query, paymentStatus: paymentStatus || undefined, page, pageSize: PAGE_SIZE })
      .then((list) => current && setLoaded({ key, list }))
      .catch((error: unknown) => current && setLoaded({ key, error: errorMessage(error, "Không thể tải đơn hàng.") }));
    return () => {
      current = false;
    };
    // `statuses` is derived from `tab`, which is part of `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, key]);

  async function buyAgain(orderNumber: string) {
    if (!accessToken || reordering) return;
    setReordering(orderNumber);
    setBanner(null);
    try {
      const result: ReorderResult = await reorderMyOrder(accessToken, orderNumber);
      refreshCart();
      const text =
        result.added === 0
          ? "Không thêm được sản phẩm nào vào giỏ hàng."
          : `Đã thêm ${result.added} sản phẩm vào giỏ hàng.${result.skipped > 0 ? ` ${result.skipped} sản phẩm không thể thêm.` : ""}`;
      setBanner({ tone: result.added === 0 ? "error" : result.notices.length > 0 ? "warning" : "success", text, notices: result.notices, cart: result.added > 0 });
    } catch (error) {
      setBanner({ tone: "error", text: errorMessage(error, "Không thể mua lại đơn hàng này."), notices: [], cart: false });
    } finally {
      setReordering(null);
    }
  }

  const list = loaded && "list" in loaded ? loaded.list : null;
  const counts = list?.statusCounts;
  const total = counts ? Object.values(counts).reduce((sum, value) => sum + value, 0) : null;
  const countOf = (itemStatuses: string[]) =>
    counts ? (itemStatuses.length === 0 ? total : itemStatuses.reduce((sum, status) => sum + (counts[status as keyof typeof counts] ?? 0), 0)) : null;
  const filtered = tab !== "all" || paymentStatus !== "" || query !== "";

  const searchForm = (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        setQuery(search.trim());
        setPage(1);
      }}
      className="relative w-full sm:w-72"
    >
      <label htmlFor="order-search" className="sr-only">
        Tìm đơn hàng theo mã hoặc tên sản phẩm
      </label>
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
      <input
        id="order-search"
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        maxLength={100}
        placeholder="Tìm mã đơn, tên sản phẩm..."
        className="w-full rounded-lg bg-[#EAF2FB] py-2.5 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-500 focus:ring-2 focus:ring-[#0F3860]/30 focus:outline-none"
      />
    </form>
  );

  return (
    <>
      <AccountPageHeader
        eyebrow="LỊCH SỬ & ĐƠN HÀNG"
        title="Đơn hàng của tôi"
        description="Theo dõi trạng thái, xem lại và mua lại các đơn hải sản của bạn."
        aside={searchForm}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Lọc theo trạng thái đơn hàng" className="flex flex-wrap gap-1">
          {ORDER_TABS.map((item) => {
            const count = countOf(item.statuses);
            return (
              <button
                key={item.key}
                type="button"
                aria-pressed={tab === item.key}
                onClick={() => {
                  setTab(item.key);
                  setPage(1);
                }}
                className={cn(
                  "rounded-lg px-2.5 py-2 text-xs font-bold whitespace-nowrap transition-colors",
                  tab === item.key ? "bg-[#0F3860] text-white" : "text-slate-600 hover:bg-slate-100",
                )}
              >
                {item.label}
                {count !== null && ` (${count})`}
              </button>
            );
          })}
        </nav>

        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          Thanh toán
          <select
            value={paymentStatus}
            onChange={(event) => {
              setPaymentStatus(event.target.value as PaymentStatus | "");
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:border-[#0F3860] focus:ring-2 focus:ring-[#0F3860]/20 focus:outline-none"
          >
            <option value="">Tất cả</option>
            {PAYMENT_FILTERS.map((filter) => (
              <option key={filter} value={filter}>
                {PAYMENT_STATUS[filter].label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {banner && (
        <div
          role={banner.tone === "error" ? "alert" : "status"}
          className={cn(
            "flex items-start gap-2 rounded-xl border p-3 text-sm",
            banner.tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-800",
            banner.tone === "warning" && "border-amber-200 bg-amber-50 text-amber-900",
            banner.tone === "error" && "border-rose-200 bg-rose-50 text-rose-800",
          )}
        >
          {banner.tone === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{banner.text}</p>
            {banner.notices.length > 0 && (
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
                {banner.notices.map((notice) => (
                  <li key={notice}>{notice}</li>
                ))}
              </ul>
            )}
          </div>
          {banner.cart && (
            <Link href="/customer/cart" className="shrink-0 font-bold underline">
              Xem giỏ hàng
            </Link>
          )}
        </div>
      )}

      {loaded && "error" in loaded && !loading ? (
        <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
          <p className="font-semibold">Không thể tải đơn hàng</p>
          <p className="mt-1">{loaded.error}</p>
          <button type="button" onClick={() => setReloadCount((count) => count + 1)} className="mt-3 font-semibold underline">
            Thử lại
          </button>
        </div>
      ) : !list ? (
        <p className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500" role="status">
          <Loader2 className="h-5 w-5 animate-spin text-[#0F3860] motion-reduce:animate-none" aria-hidden="true" />
          Đang tải đơn hàng...
        </p>
      ) : list.items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/70 bg-white px-6 py-14 text-center shadow-xs">
          <ClipboardList className="mx-auto h-10 w-10 text-slate-300" aria-hidden="true" />
          <p className="mt-3 text-base font-bold text-slate-900">{filtered ? "Không có đơn phù hợp" : "Bạn chưa có đơn hàng nào"}</p>
          <p className="mt-1 text-sm text-slate-500">{filtered ? "Thử tìm từ khóa khác hoặc chọn trạng thái khác." : "Đơn hàng sẽ hiện ở đây sau khi bạn đặt mua."}</p>
          {!filtered && (
            <Link href="/products" className="mt-4 inline-flex rounded-lg bg-[#0F3860] px-4 py-2 text-sm font-bold text-white hover:bg-[#0A2744]">
              Khám phá hải sản
            </Link>
          )}
        </div>
      ) : (
        <div className={cn("space-y-4 transition-opacity motion-reduce:transition-none", loading && "opacity-60")} aria-busy={loading}>
          {list.items.map((order) => (
            <OrderHistoryCard
              key={order.orderNumber}
              order={order}
              reordering={reordering === order.orderNumber}
              reorderDisabled={reordering !== null}
              onReorder={buyAgain}
            />
          ))}

          <nav className="flex flex-wrap items-center justify-between gap-3 text-sm" aria-label="Phân trang">
            <p className="text-slate-500">
              Hiển thị {list.items.length} / {list.pagination.totalItems} đơn · Trang {list.pagination.page}/{list.pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage(list.pagination.page - 1)}
                disabled={list.pagination.page <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Trước
              </button>
              <button
                type="button"
                onClick={() => setPage(list.pagination.page + 1)}
                disabled={list.pagination.page >= list.pagination.totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sau
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
