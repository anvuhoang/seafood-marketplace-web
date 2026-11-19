"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, ClipboardList, Loader2, Store } from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { cn } from "@/lib/utils";
import { listMyOrders } from "../api/customer-order.api";
import { ORDER_STATUS, VENDOR_ORDER_STATUS, paymentStyle } from "../constants/order-status";
import type { CustomerOrderList, OrderStatus } from "../types/order.types";
import { errorMessage, formatDateTime, formatQuantity, formatVnd } from "../utils/order-format";
import { StatusBadge } from "./StatusBadge";

const PAGE_SIZE = 10;
const FILTERS: Array<OrderStatus | ""> = ["", "PENDING", "CONFIRMED", "PROCESSING", "SHIPPING", "COMPLETED", "CANCELLED"];

type Loaded = { key: string; list: CustomerOrderList } | { key: string; error: string };

/** The signed-in customer's orders, newest first, each with the status of every vendor in it. */
export function CustomerOrdersView() {
  const { accessToken } = useAuth();
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [page, setPage] = useState(1);
  const [reloadCount, setReloadCount] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  const key = JSON.stringify({ status, page, reloadCount });
  const loading = !loaded || loaded.key !== key;

  useEffect(() => {
    if (!accessToken) return;
    let current = true;
    listMyOrders(accessToken, { status: status || undefined, page, pageSize: PAGE_SIZE })
      .then((list) => current && setLoaded({ key, list }))
      .catch((error: unknown) => current && setLoaded({ key, error: errorMessage(error, "Không thể tải đơn hàng.") }));
    return () => {
      current = false;
    };
  }, [accessToken, key, status, page]);

  const list = loaded && "list" in loaded ? loaded.list : null;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0F3860] text-white">
            <ClipboardList className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900">Đơn mua của tôi</h1>
            <p className="text-xs text-slate-500">Theo dõi trạng thái từng vựa trong đơn hàng của bạn</p>
          </div>
        </div>
        <Link href="/products" className="text-xs font-bold text-[#0F3860] hover:underline">
          + Đặt thêm hải sản
        </Link>
      </div>

      <nav aria-label="Lọc theo trạng thái" className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter || "all"}
            type="button"
            aria-pressed={status === filter}
            onClick={() => {
              setStatus(filter);
              setPage(1);
            }}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              status === filter
                ? "border-[#0F3860] bg-[#0F3860] text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
          >
            {filter ? ORDER_STATUS[filter].label : "Tất cả"}
          </button>
        ))}
      </nav>

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
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center">
          <ClipboardList className="mx-auto h-10 w-10 text-slate-300" aria-hidden="true" />
          <p className="mt-3 text-base font-bold text-slate-900">{status ? "Không có đơn ở trạng thái này" : "Bạn chưa có đơn hàng nào"}</p>
          <p className="mt-1 text-sm text-slate-500">{status ? "Thử chọn trạng thái khác." : "Đơn hàng sẽ hiện ở đây sau khi bạn đặt mua."}</p>
        </div>
      ) : (
        <div className={cn("space-y-4 transition-opacity motion-reduce:transition-none", loading && "opacity-60")} aria-busy={loading}>
          {list.items.map((order) => (
            <article key={order.orderNumber} className="min-w-0 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 text-xs">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="font-mono font-bold break-all text-slate-900">#{order.orderNumber}</span>
                  <span className="text-slate-300" aria-hidden="true">
                    •
                  </span>
                  <time dateTime={order.createdAt} className="text-slate-500">
                    {formatDateTime(order.createdAt)}
                  </time>
                </div>
                <StatusBadge style={ORDER_STATUS[order.status]} />
              </div>

              <ul className="space-y-3">
                {order.vendorOrders.map((vendorOrder) => (
                  <li key={vendorOrder.id} className="min-w-0 rounded-xl bg-slate-50 p-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-slate-700">
                        <Store className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                        <span className="break-words">{vendorOrder.vendor.name}</span>
                      </p>
                      <StatusBadge style={VENDOR_ORDER_STATUS[vendorOrder.status]} />
                    </div>
                    <ul className="space-y-1 text-sm">
                      {vendorOrder.items.map((item) => (
                        <li key={item.id} className="flex items-start justify-between gap-3">
                          <span className="min-w-0 break-words text-slate-900">
                            {item.productName}
                            <span className="text-xs text-slate-500"> · {item.variantName}</span>
                            <span className="block text-xs text-slate-500">
                              Số lượng: <strong>{formatQuantity(item.quantity)} {item.unit}</strong>
                            </span>
                          </span>
                          <span className="shrink-0 tabular-nums text-slate-700">{formatVnd(item.lineTotal)}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <StatusBadge style={paymentStyle(order.payment)} />
                <div className="flex flex-wrap items-center gap-4">
                  <p className="text-base font-bold tabular-nums text-[#E63946]">{formatVnd(order.grandTotal)}</p>
                  <Link
                    href={`/customer/orders/${encodeURIComponent(order.orderNumber)}`}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-[#0F3860] hover:underline"
                  >
                    {order.canCancel ? "Xem hoặc hủy đơn" : "Xem chi tiết"}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </article>
          ))}

          <nav className="flex flex-wrap items-center justify-between gap-3 text-sm" aria-label="Phân trang">
            <p className="text-slate-500">
              {list.pagination.totalItems} đơn · Trang {list.pagination.page}/{list.pagination.totalPages}
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
