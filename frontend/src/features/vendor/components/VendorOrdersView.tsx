"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Clock, Loader2, Search, ShoppingBag, X } from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { StatusBadge } from "@/features/order/components/StatusBadge";
import { VENDOR_ORDER_STATUS, paymentStyle } from "@/features/order/constants/order-status";
import type { VendorOrderStatus } from "@/features/order/types/order.types";
import { errorMessage, formatDateTime, formatQuantity, formatVnd } from "@/features/order/utils/order-format";
import { cn } from "@/lib/utils";
import { listMyOrders } from "../api/vendor-order.api";
import type { VendorOrderList, VendorOrderListItem } from "../types/vendor-order.types";
import { VendorPageHeader } from "./VendorPageHeader";
import { fieldClass } from "./VendorDialog";

const PAGE_SIZE = 10;
const TABS: Array<VendorOrderStatus | ""> = ["", "PENDING", "ACCEPTED", "PREPARING", "SHIPPING", "COMPLETED", "CANCELLED"];

type Loaded = { key: string; list: VendorOrderList } | { key: string; error: string };

const isStatus = (value: string | null): value is VendorOrderStatus =>
  value !== null && (TABS as string[]).includes(value) && value !== "";

/** The vendor's orders: status tabs with store-wide counts, search, date range and pages. */
export function VendorOrdersView() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status");

  const [status, setStatus] = useState<VendorOrderStatus | "">(isStatus(initialStatus) ? initialStatus : "");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [reloadCount, setReloadCount] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  const key = JSON.stringify({ status, search, from, to, page, reloadCount });
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
    if (!accessToken) return;
    let current = true;
    listMyOrders(accessToken, {
      status: status || undefined,
      search: search || undefined,
      from: from || undefined,
      to: to || undefined,
      page,
      pageSize: PAGE_SIZE,
    })
      .then((list) => current && setLoaded({ key, list }))
      .catch((error: unknown) => current && setLoaded({ key, error: errorMessage(error, "Không thể tải danh sách đơn hàng.") }));
    return () => {
      current = false;
    };
  }, [accessToken, key, status, search, from, to, page]);

  const list = loaded && "list" in loaded ? loaded.list : null;
  const filtered = Boolean(status || search || from || to);

  function pickStatus(next: VendorOrderStatus | "") {
    setStatus(next);
    setPage(1);
    // Kept in the URL so coming back from an order returns to the same tab.
    router.replace(next ? `${pathname}?status=${next}` : pathname, { scroll: false });
  }

  return (
    <>
      <VendorPageHeader title="Quản lý đơn hàng" description="Nhận đơn, chuẩn bị và bàn giao các đơn hàng của gian hàng." />

      <nav aria-label="Lọc theo trạng thái" className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const active = status === tab;
          const count = list ? (tab ? list.summary[tab] : list.summary.total) : null;
          return (
            <button
              key={tab || "all"}
              type="button"
              onClick={() => pickStatus(tab)}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors",
                active ? "border-brand bg-brand text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              )}
            >
              {tab ? VENDOR_ORDER_STATUS[tab].label : "Tất cả đơn"}
              <span
                className={cn(
                  "min-w-6 rounded-full px-1.5 py-0.5 text-xs tabular-nums",
                  active ? "bg-white/20 text-white" : tab === "PENDING" && count ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-600",
                )}
              >
                {count ?? "–"}
              </span>
            </button>
          );
        })}
      </nav>

      <section className="mt-4 min-w-0 rounded-2xl border border-slate-200 bg-white" aria-labelledby="order-list-title">
        <h2 id="order-list-title" className="sr-only">
          Danh sách đơn hàng
        </h2>
        <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_170px_170px_auto]">
          <label className="relative block min-w-0 sm:col-span-2 lg:col-span-1">
            <span className="sr-only">Tìm đơn hàng</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Tìm theo mã đơn, tên hoặc số điện thoại người nhận"
              className={fieldClass(false, "pl-9")}
            />
          </label>
          <label className="block min-w-0 text-xs text-slate-500">
            <span className="sr-only sm:not-sr-only lg:sr-only">Từ ngày</span>
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(event) => {
                setFrom(event.target.value);
                setPage(1);
              }}
              aria-label="Từ ngày"
              className={fieldClass(false)}
            />
          </label>
          <label className="block min-w-0 text-xs text-slate-500">
            <span className="sr-only sm:not-sr-only lg:sr-only">Đến ngày</span>
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(event) => {
                setTo(event.target.value);
                setPage(1);
              }}
              aria-label="Đến ngày"
              className={fieldClass(false)}
            />
          </label>
          {(from || to) && (
            <button
              type="button"
              onClick={() => {
                setFrom("");
                setTo("");
                setPage(1);
              }}
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Bỏ lọc ngày
            </button>
          )}
        </div>

        {loaded && "error" in loaded && !loading ? (
          <div role="alert" className="m-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <p className="font-semibold">Không thể tải danh sách đơn hàng</p>
            <p className="mt-1">{loaded.error}</p>
            <button type="button" onClick={() => setReloadCount((count) => count + 1)} className="mt-3 font-semibold underline">
              Thử lại
            </button>
          </div>
        ) : !list ? (
          <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500" role="status">
            <Loader2 className="h-5 w-5 animate-spin text-brand motion-reduce:animate-none" aria-hidden="true" />
            Đang tải đơn hàng...
          </div>
        ) : list.items.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <ShoppingBag className="mx-auto h-10 w-10 text-slate-300" aria-hidden="true" />
            <p className="mt-3 text-base font-bold text-slate-900">{filtered ? "Không có đơn phù hợp" : "Gian hàng chưa có đơn hàng"}</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
              {filtered ? "Thử đổi từ khóa, trạng thái hoặc khoảng ngày." : "Đơn hàng của khách sẽ hiện ở đây khi có người đặt mua."}
            </p>
          </div>
        ) : (
          <div className={cn("transition-opacity motion-reduce:transition-none", loading && "opacity-60")} aria-busy={loading}>
            <OrderTable orders={list.items} />
            <nav className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm" aria-label="Phân trang">
              <p className="text-slate-500">
                {list.pagination.totalItems} đơn · Trang {list.pagination.page}/{list.pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <PageButton disabled={list.pagination.page <= 1} onClick={() => setPage(list.pagination.page - 1)}>
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  Trước
                </PageButton>
                <PageButton
                  disabled={list.pagination.page >= list.pagination.totalPages}
                  onClick={() => setPage(list.pagination.page + 1)}
                >
                  Sau
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </PageButton>
              </div>
            </nav>
          </div>
        )}
      </section>
    </>
  );
}

function PageButton({ disabled, onClick, children }: { disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

const detailHref = (order: VendorOrderListItem) => `/vendor/orders/${order.id}`;

/** Table from md up; stacked cards on phones so nothing scrolls sideways. */
function OrderTable({ orders }: { orders: VendorOrderListItem[] }) {
  return (
    <>
      <div className="hidden md:block">
        <table className="w-full table-fixed text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500">
            <tr>
              <th scope="col" className="w-[18%] px-4 py-3">
                Mã đơn và giờ đặt
              </th>
              <th scope="col" className="w-[19%] px-3 py-3">
                Người nhận
              </th>
              <th scope="col" className="px-3 py-3">
                Mặt hàng
              </th>
              <th scope="col" className="w-[14%] px-3 py-3 text-right">
                Tổng tiền
              </th>
              <th scope="col" className="w-[14%] px-3 py-3">
                Thanh toán
              </th>
              <th scope="col" className="w-[14%] px-4 py-3">
                Trạng thái
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.map((order) => (
              <tr key={order.id} className="align-top transition-colors hover:bg-slate-50/70">
                <td className="px-4 py-3">
                  <Link href={detailHref(order)} className="font-semibold break-all text-brand hover:underline">
                    #{order.orderNumber}
                  </Link>
                  <OrderTime createdAt={order.createdAt} />
                </td>
                <td className="px-3 py-3">
                  <p className="font-semibold break-words text-slate-900">{order.recipientName}</p>
                  <p className="text-xs text-slate-500">{order.recipientPhone}</p>
                </td>
                <td className="px-3 py-3">
                  <ItemsSummary order={order} />
                </td>
                <td className="px-3 py-3 text-right font-semibold tabular-nums text-slate-900">{formatVnd(order.grandTotal)}</td>
                <td className="px-3 py-3">
                  <StatusBadge style={paymentStyle(order.payment)} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge style={VENDOR_ORDER_STATUS[order.status]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-slate-100 md:hidden">
        {orders.map((order) => (
          <li key={order.id}>
            <Link href={detailHref(order)} className="block space-y-2 p-4 transition-colors hover:bg-slate-50/70">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold break-all text-brand">#{order.orderNumber}</p>
                  <OrderTime createdAt={order.createdAt} />
                </div>
                <StatusBadge style={VENDOR_ORDER_STATUS[order.status]} />
              </div>
              <p className="text-sm break-words">
                <span className="font-semibold text-slate-900">{order.recipientName}</span>
                <span className="text-slate-500"> · {order.recipientPhone}</span>
              </p>
              <ItemsSummary order={order} />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold tabular-nums text-slate-900">{formatVnd(order.grandTotal)}</p>
                <StatusBadge style={paymentStyle(order.payment)} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

function OrderTime({ createdAt }: { createdAt: string }) {
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
      <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <time dateTime={createdAt}>{formatDateTime(createdAt)}</time>
    </p>
  );
}

function ItemsSummary({ order }: { order: VendorOrderListItem }) {
  if (!order.firstItem) return <p className="text-sm text-slate-500">—</p>;
  const { productName, variantName, quantity, unit } = order.firstItem;
  return (
    <div className="min-w-0 text-sm text-slate-700">
      <p className="break-words">
        <span className="font-semibold">
          {formatQuantity(quantity)} {unit}
        </span>{" "}
        {productName}
        {variantName && <span className="text-xs text-slate-500"> ({variantName})</span>}
      </p>
      {order.itemCount > 1 && <p className="text-xs text-slate-500">và {order.itemCount - 1} món khác</p>}
    </div>
  );
}
