"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Banknote, Clock, Info, Loader2, Package, ShoppingBag, Store } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { cn, formatPrice } from "@/lib/utils";
import { VENDOR_ORDER_STATUS } from "@/features/order/constants/order-status";
import { getMyStats } from "../api/vendor-stats.api";
import { REVENUE_RULE } from "../constants/revenue";
import { VENDOR_REGISTER_PATH } from "../constants/store-status";
import { useVendorDashboard } from "../context/VendorDashboardContext";
import type { VendorDashboard, VendorDashboardOrder, VendorOrderStatus } from "../types/vendor.types";
import type { VendorStats } from "../types/vendor-stats.types";
import { describeDay } from "../utils/vendor-stats";
import { RevenueBarChart } from "./RevenueBarChart";
import { VendorPageHeader } from "./VendorPageHeader";


const timeFormat = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" });
const dateFormat = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

function formatQuantity(value: string): string {
  return Number(value).toLocaleString("vi-VN", { maximumFractionDigits: 3 });
}

export function VendorDashboardContent() {
  const state = useVendorDashboard();

  return (
    <>
      <VendorPageHeader
        title="Tổng quan gian hàng"
        description={
          state.kind === "ready"
            ? `Đơn cần xử lý, hàng sắp hết và doanh thu của ${state.dashboard.vendor.name}.`
            : "Đơn cần xử lý, hàng sắp hết và doanh thu của gian hàng."
        }
      />

      {state.kind === "loading" ? (
        <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white text-sm text-slate-500" role="status">
          <Loader2 className="h-6 w-6 animate-spin text-brand motion-reduce:animate-none" aria-hidden />
          <p>Đang tải số liệu gian hàng...</p>
        </div>
      ) : state.kind === "no-store" ? (
        <section className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
          <Store className="mx-auto h-10 w-10 text-slate-300" aria-hidden />
          <h2 className="mt-3 text-base font-bold text-slate-900">Tài khoản của bạn chưa có gian hàng</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Đăng ký mở gian hàng để bắt đầu nhận đơn trên HaiSan Express.</p>
          <Link
            href={VENDOR_REGISTER_PATH}
            className="mt-5 inline-flex rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            Đăng ký mở gian hàng
          </Link>
        </section>
      ) : state.kind === "error" ? (
        <section role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
          <h2 className="font-bold">Không thể tải số liệu gian hàng</h2>
          <p className="mt-1">{state.message}</p>
        </section>
      ) : (
        <DashboardBody dashboard={state.dashboard} />
      )}
    </>
  );
}

function DashboardBody({ dashboard }: { dashboard: VendorDashboard }) {
  const { summary, ordersNeedingAction, lowStockOffers, ordersByStatus } = dashboard;
  const countOf = (status: VendorOrderStatus) => ordersByStatus.find((row) => row.status === status)?.count ?? 0;
  const completedCount = countOf("COMPLETED");

  return (
    <div className="space-y-6">
      <section aria-label="Số liệu gian hàng" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={ShoppingBag}
          label="Đơn cần xử lý"
          value={`${summary.ordersNeedingActionCount} đơn`}
          note="Đơn chờ xác nhận hoặc đã tiếp nhận"
          tone={summary.ordersNeedingActionCount > 0 ? "danger" : "default"}
        />
        <StatCard icon={Package} label="Sản phẩm đang bán" value={`${summary.productCount} sản phẩm`} note="Quy cách đang mở bán trên gian hàng" />
        <StatCard
          icon={AlertTriangle}
          label="Sắp hết hàng"
          value={`${summary.lowStockCount} loại`}
          note={`Còn từ ${summary.lowStockThreshold} đơn vị trở xuống`}
          tone={summary.lowStockCount > 0 ? "danger" : "default"}
        />
        <StatCard
          icon={Banknote}
          label="Doanh thu đơn hoàn tất"
          value={formatPrice(Number(summary.revenue))}
          note={`Từ ${completedCount} đơn hoàn tất trên tổng ${summary.orderCount} đơn`}
        />
      </section>

      <p className="flex gap-2 text-sm text-slate-600">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
        <span>{REVENUE_RULE}</span>
      </p>

      <WeekRevenue />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <OrdersPanel
          orders={ordersNeedingAction}
          total={summary.ordersNeedingActionCount}
          pendingCount={countOf("PENDING")}
          acceptedCount={countOf("ACCEPTED")}
        />
        <LowStockPanel offers={lowStockOffers} total={summary.lowStockCount} threshold={summary.lowStockThreshold} />
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  note,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  note: string;
  tone?: "default" | "danger";
}) {
  const danger = tone === "danger";
  return (
    <div className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            danger ? "bg-rose-50 text-danger" : "bg-brand-soft/50 text-brand",
          )}
          aria-hidden
        >
          <Icon className="h-4.5 w-4.5" />
        </span>
      </div>
      <p className={cn("mt-2 text-2xl font-bold break-words sm:text-[28px]", danger ? "text-danger" : "text-slate-900")}>{value}</p>
      <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{note}</p>
    </div>
  );
}

function OrdersPanel({
  orders: visible,
  total,
  pendingCount,
  acceptedCount,
}: {
  orders: VendorDashboardOrder[];
  total: number;
  pendingCount: number;
  acceptedCount: number;
}) {

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white" aria-labelledby="new-orders-title">
      <div className="flex flex-wrap items-start justify-between gap-3 p-5">
        <div>
          <h2 id="new-orders-title" className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <span className="h-2 w-2 rounded-full bg-danger" aria-hidden />
            Đơn hàng mới cần xử lý
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">Đơn chờ xác nhận trước, đơn chờ lâu nhất ở trên cùng.</p>
        </div>
        {total > 0 && (
          <span className="rounded-md bg-rose-50 px-2.5 py-1 text-xs font-semibold text-danger">{total} đơn cần xử lý</span>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="mx-5 mb-5 rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          Không có đơn nào cần xử lý lúc này.
        </p>
      ) : (
        <>
          {/* Table from md up; stacked cards on phones so nothing scrolls sideways. */}
          <div className="hidden md:block">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th scope="col" className="w-[17%] px-5 py-3 font-semibold">Mã đơn và giờ</th>
                  <th scope="col" className="w-[22%] px-3 py-3 font-semibold">Khách hàng và nơi nhận</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Mặt hàng</th>
                  <th scope="col" className="w-[15%] px-3 py-3 font-semibold">Tổng tiền</th>
                  <th scope="col" className="w-[15%] px-5 py-3 font-semibold">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((order) => (
                  <tr key={order.id} className="align-top">
                    <td className="px-5 py-4">
                      <Link href={`/vendor/orders/${order.id}`} className="font-semibold break-all text-brand hover:underline">
                        #{order.orderNumber}
                      </Link>
                      <OrderTime createdAt={order.createdAt} />
                    </td>
                    <td className="px-3 py-4">
                      <p className="font-semibold text-slate-900">{order.customerName}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{order.customerPhone}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{order.shippingAddress}</p>
                    </td>
                    <td className="px-3 py-4">
                      <OrderItems order={order} />
                    </td>
                    <td className="px-3 py-4 font-semibold text-danger">{formatPrice(Number(order.subtotal))}</td>
                    <td className="px-5 py-4">
                      <OrderStatusBadge status={order.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-slate-100 border-t border-slate-100 md:hidden">
            {visible.map((order) => (
              <li key={order.id} className="space-y-2 px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/vendor/orders/${order.id}`} className="font-semibold break-all text-brand hover:underline">
                        #{order.orderNumber}
                      </Link>
                    <OrderTime createdAt={order.createdAt} />
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>
                <p className="text-sm">
                  <span className="font-semibold text-slate-900">{order.customerName}</span>
                  <span className="text-slate-500"> · {order.customerPhone}</span>
                </p>
                <OrderItems order={order} />
                <p className="text-sm font-semibold text-danger">{formatPrice(Number(order.subtotal))}</p>
              </li>
            ))}
          </ul>

          <div className="m-5 flex flex-col gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-slate-500">
              Đang hiển thị <strong className="text-slate-900">{visible.length}</strong> trên{" "}
              <strong className="text-slate-900">{total}</strong> đơn cần xử lý.
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {pendingCount > 0 && (
                <Link href="/vendor/orders?status=PENDING" className="inline-flex items-center gap-1.5 font-semibold text-brand hover:underline">
                  Xem {pendingCount} đơn chờ xác nhận
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              )}
              {acceptedCount > 0 && (
                <Link href="/vendor/orders?status=ACCEPTED" className="inline-flex items-center gap-1.5 font-semibold text-brand hover:underline">
                  Xem {acceptedCount} đơn đã nhận
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function OrderTime({ createdAt }: { createdAt: string }) {
  const date = new Date(createdAt);
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
      <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <time dateTime={createdAt}>
        {timeFormat.format(date)} · {dateFormat.format(date)}
      </time>
    </p>
  );
}

function OrderItems({ order }: { order: VendorDashboardOrder }) {
  return (
    <ul className="space-y-1 text-sm text-slate-700">
      {order.items.map((item, index) => (
        <li key={`${order.id}-${index}`}>
          <span className="font-semibold">
            {formatQuantity(item.quantity)} {item.unit}
          </span>{" "}
          {item.productName}
          {item.variantName && <span className="text-xs text-slate-500"> ({item.variantName})</span>}
        </li>
      ))}
    </ul>
  );
}

function OrderStatusBadge({ status }: { status: VendorOrderStatus }) {
  const badge = VENDOR_ORDER_STATUS[status];
  return (
    <span className={cn("inline-block shrink-0 rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-inset", badge.className)}>
      {badge.label}
    </span>
  );
}

function LowStockPanel({
  offers,
  total,
  threshold,
}: {
  offers: VendorDashboard["lowStockOffers"];
  total: number;
  threshold: number;
}) {
  return (
    <section className="min-w-0 self-start rounded-2xl border border-slate-200 bg-white p-5" aria-labelledby="low-stock-title">
      <div className="flex items-start justify-between gap-3">
        <h2 id="low-stock-title" className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <AlertTriangle className="h-5 w-5 text-danger" aria-hidden />
          Cảnh báo tồn kho thấp
        </h2>
        {total > 0 && (
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-danger px-1.5 text-xs font-semibold text-white">
            {total}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-500">Sản phẩm đang bán còn từ {threshold} đơn vị trở xuống.</p>

      {offers.length === 0 ? (
        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">Chưa có sản phẩm nào sắp hết.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {offers.map((offer) => {
            const stock = Number(offer.stock);
            return (
              <li key={offer.id} className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{offer.productName}</p>
                    {offer.variantName && <p className="mt-0.5 text-xs text-slate-500">{offer.variantName}</p>}
                  </div>
                  <p className="shrink-0 text-right text-lg font-bold text-danger">
                    {formatQuantity(offer.stock)} {offer.unit}
                  </p>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200" aria-hidden>
                  <div className="h-full rounded-full bg-danger" style={{ width: `${Math.max(4, Math.min(100, (stock / threshold) * 100))}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {total > offers.length && (
        <p className="mt-3 text-xs text-slate-500">
          Đang hiển thị {offers.length} trên {total} sản phẩm sắp hết, tồn kho thấp nhất trước.
        </p>
      )}

      <Link
        href="/vendor/products"
        className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
      >
        Quản lý sản phẩm
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </section>
  );
}

type WeekState = { kind: "ready"; stats: VendorStats } | { kind: "error"; message: string } | null;

/** Revenue of the last 7 days from GET /vendors/me/stats, with a link to the full statistics page. */
function WeekRevenue() {
  const { accessToken } = useAuth();
  const [state, setState] = useState<WeekState>(null);

  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    getMyStats(accessToken, { range: "7d" })
      .then((stats) => active && setState({ kind: "ready", stats }))
      .catch((error: unknown) =>
        active && setState({ kind: "error", message: error instanceof Error ? error.message : "Không thể tải doanh thu 7 ngày qua." }),
      );
    return () => {
      active = false;
    };
  }, [accessToken]);

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5" aria-labelledby="week-revenue-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="week-revenue-title" className="text-lg font-bold text-slate-900">Doanh thu 7 ngày qua</h2>
          {state?.kind === "ready" && (
            <p className="mt-0.5 text-sm text-slate-500">
              <strong className="text-slate-900">{formatPrice(Number(state.stats.summary.revenue.value))}</strong> từ{" "}
              {state.stats.summary.completedOrders.value} đơn hoàn tất
            </p>
          )}
        </div>
        <Link href="/vendor/statistics" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
          Xem thống kê chi tiết
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      <div className="mt-2">
        {state === null ? (
          <div className="shimmer h-40 rounded-xl" role="status" aria-label="Đang tải doanh thu 7 ngày qua" />
        ) : state.kind === "error" ? (
          <p role="alert" className="rounded-xl bg-rose-50 px-4 py-6 text-center text-sm text-rose-800">
            {state.message}
          </p>
        ) : (
          <RevenueBarChart
            compact
            days={state.stats.series}
            label={`Doanh thu từ ${describeDay(state.stats.period.from).long} đến ${describeDay(state.stats.period.to).long}`}
          />
        )}
      </div>
    </section>
  );
}
