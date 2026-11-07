
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ClipboardList,
  Loader2,
  Package,
  Store,
} from "lucide-react";
import { ApiError } from "@/features/auth/api/auth.api";
import { useAuth } from "@/features/auth/context/AuthContext";
import { getVendorDashboard } from "@/features/vendor/api/vendor.api";
import type {
  VendorDashboard,
  VendorOrderStatus,
} from "@/features/vendor/types/vendor.types";
import { formatPrice } from "@/lib/utils";

const ORDER_STATUS_LABELS: Record<VendorOrderStatus, string> = {
  PENDING: "Chờ xác nhận",
  ACCEPTED: "Đã tiếp nhận",
  PREPARING: "Đang chuẩn bị",
  SHIPPING: "Đang giao",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
};

function formatStock(stock: string): string {
  return Number(stock).toLocaleString("vi-VN");
}

export function VendorDashboardContent() {
  const { accessToken } = useAuth();
  const [result, setResult] = useState<
    | { token: string; dashboard: VendorDashboard; error: null }
    | { token: string; dashboard: null; error: Error }
    | null
  >(null);

  const currentResult =
    accessToken && result?.token === accessToken ? result : null;
  const dashboard = currentResult?.dashboard ?? null;
  const error = currentResult?.error ?? null;
  const isLoading = Boolean(accessToken) && currentResult === null;

  useEffect(() => {
    let active = true;

    if (!accessToken) {
      return;
    }

    getVendorDashboard(accessToken)
      .then((dashboardResult) => {
        if (active) {
          setResult({
            token: accessToken,
            dashboard: dashboardResult,
            error: null,
          });
        }
      })
      .catch((requestError: unknown) => {
        if (active) {
          setResult({
            token: accessToken,
            dashboard: null,
            error:
              requestError instanceof Error
                ? requestError
                : new Error("Không thể tải dữ liệu bảng điều khiển."),
          });
        }
      });

    return () => {
      active = false;
    };
  }, [accessToken]);

  const noStore = error instanceof ApiError && error.statusCode === 404;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
            <Store className="h-6 w-6" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black text-slate-900">
                Bảng Điều Khiển Vựa
              </h1>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                Kênh Người Bán
              </span>
            </div>

            <p className="truncate text-xs text-slate-500">
              {dashboard?.vendor.name ??
                (isLoading ? "Đang tải thông tin gian hàng..." : "")}
            </p>
          </div>
        </div>

        <nav
          aria-label="Điều hướng quản lý gian hàng"
          className="flex flex-wrap items-center gap-2"
        >
          <Link
            href="/vendor/products"
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Quản lý sản phẩm
          </Link>

          <Link
            href="/vendor/orders"
            className="rounded-xl bg-[#0F3860] px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-[#0A2744]"
          >
            Quản lý đơn hàng
          </Link>
        </nav>
      </header>

      {isLoading && accessToken ? (
        <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white text-sm text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          <p>Đang tải số liệu gian hàng...</p>
        </div>
      ) : !accessToken ? (
        <section
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800"
        >
          <h2 className="font-bold">Phiên đăng nhập không hợp lệ</h2>
          <p className="mt-1">
            Vui lòng đăng nhập lại để xem bảng điều khiển.
          </p>
        </section>
      ) : noStore ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
          <h2 className="font-bold">Chưa có gian hàng được liên kết</h2>
          <p className="mt-1">
            Tài khoản hiện tại chưa được liên kết với hồ sơ Vendor. Vui lòng
            liên hệ quản trị viên để hoàn tất đăng ký gian hàng.
          </p>
        </section>
      ) : error ? (
        <section
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800"
        >
          <h2 className="font-bold">Không thể tải bảng điều khiển</h2>
          <p className="mt-1">{error.message}</p>
        </section>
      ) : dashboard ? (
        <>
          <section
            aria-label="Thống kê gian hàng"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase text-slate-400">
                <Package className="h-4 w-4" />
                Ưu đãi đang hoạt động
              </div>
              <p className="text-2xl font-black text-[#0F3860]">
                {dashboard.summary.productCount}
              </p>
              <p className="text-xs text-slate-500">
                Số ưu đãi đang hoạt động
              </p>
            </div>

            <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase text-slate-400">
                <ClipboardList className="h-4 w-4" />
                Tổng đơn hàng
              </div>
              <p className="text-2xl font-black text-[#0F3860]">
                {dashboard.summary.orderCount}
              </p>
              <p className="text-xs text-slate-500">
                Tất cả đơn của gian hàng
              </p>
            </div>

            <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase text-slate-400">
                <AlertTriangle className="h-4 w-4" />
                Đơn cần xử lý
              </div>
              <p className="text-2xl font-black text-amber-600">
                {dashboard.summary.ordersNeedingActionCount}
              </p>
              <p className="text-xs text-slate-500">
                Chờ xác nhận hoặc đã tiếp nhận
              </p>
            </div>

            <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="text-[11px] font-bold uppercase text-slate-400">
                Doanh thu
              </div>
              <p className="break-words text-2xl font-black text-emerald-700">
                {formatPrice(Number(dashboard.summary.revenue))}
              </p>
              <p className="text-xs text-slate-500">
                Đơn Vendor đã hoàn tất
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
            <h2 className="text-sm font-bold text-slate-900">
              Đơn hàng theo trạng thái
            </h2>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {dashboard.ordersByStatus.map(({ status, count }) => (
                <div key={status} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold text-slate-500">
                    {ORDER_STATUS_LABELS[status]}
                  </p>
                  <p className="mt-1 text-lg font-black text-slate-900">
                    {count}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <p className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-relaxed text-blue-900">
            Doanh thu được tính từ tạm tính các đơn hàng đã hoàn tất, không bao
            gồm phí vận chuyển.
          </p>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
            <section className="min-w-0 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-slate-900">
                  Đơn hàng cần xử lý
                </h2>
                <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">
                  {dashboard.ordersNeedingAction.length}
                </span>
              </div>

              {dashboard.ordersNeedingAction.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">
                  Hiện không có đơn hàng nào cần xử lý.
                </p>
              ) : (
                dashboard.ordersNeedingAction.map((order) => (
                  <article
                    key={order.id}
                    className="min-w-0 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="min-w-0">
                        <p className="break-all font-mono text-xs font-bold text-slate-900">
                          #{order.orderNumber}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {new Date(order.createdAt).toLocaleString("vi-VN")}
                        </p>
                      </div>

                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-800">
                        {ORDER_STATUS_LABELS[order.status]}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-slate-600">
                      <p>
                        Khách hàng:{" "}
                        <strong className="text-slate-900">
                          {order.customerName}
                        </strong>
                      </p>
                      <p className="break-words">{order.customerPhone}</p>
                      <p className="break-words">{order.shippingAddress}</p>
                    </div>

                    <ul className="space-y-2 border-t border-slate-100 pt-3">
                      {order.items.map((item, index) => (
                        <li
                          key={`${order.id}-${index}`}
                          className="flex justify-between gap-3 text-xs"
                        >
                          <span className="min-w-0 break-words text-slate-700">
                            {item.productName} · {item.variantName} ·{" "}
                            {formatStock(item.quantity)} {item.unit}
                          </span>
                          <span className="shrink-0 font-semibold text-slate-900">
                            {formatPrice(Number(item.lineTotal))}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <div className="flex justify-between gap-3 border-t border-slate-100 pt-3 text-xs">
                      <span className="font-semibold text-slate-600">
                        Tạm tính của vựa
                      </span>
                      <strong className="shrink-0 text-[#0F3860]">
                        {formatPrice(Number(order.subtotal))}
                      </strong>
                    </div>
                  </article>
                ))
              )}
            </section>

            <section className="min-w-0 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-slate-900">
                  Ưu đãi sắp hết hàng
                </h2>
                <span className="shrink-0 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-800">
                  {dashboard.lowStockOffers.length}
                </span>
              </div>

              {dashboard.lowStockOffers.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">
                  Không có ưu đãi nào có tồn kho từ 5 trở xuống.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-xs">
                  {dashboard.lowStockOffers.map((offer) => (
                    <li
                      key={offer.id}
                      className="flex min-w-0 items-start justify-between gap-3 p-4"
                    >
                      <div className="min-w-0">
                        <p className="break-words text-sm font-bold text-slate-800">
                          {offer.productName}
                        </p>
                        <p className="mt-1 break-words text-xs text-slate-500">
                          {offer.variantName}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700">
                        {formatStock(offer.stock)} {offer.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
          Không có dữ liệu bảng điều khiển.
        </div>
      )}
    </main>
  );
}
