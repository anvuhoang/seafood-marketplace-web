"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Package, Receipt, RefreshCw, Users, Wallet } from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { getAdminOverview } from "../api/admin-stats.api";
import { STATUS_LABEL } from "../constants/vendor-status";
import { AdminOverview } from "../types/admin-stats.types";
import { formatCount, formatVnd } from "../utils/format";
import { BreakdownBars } from "./BreakdownBars";
import { RevenueChart } from "./RevenueChart";
import { StatTile, StatTileSkeleton } from "./StatTile";
import { VendorStatusBadge } from "./VendorStatusBadge";

type Result = { run: number; data: AdminOverview } | { run: number; error: string };

// One bordered strip with hairline dividers, instead of four separate boxes.
const KPI_STRIP =
  "grid overflow-hidden rounded-xl border border-slate-200 bg-white sm:grid-cols-2 lg:grid-cols-4 " +
  "[&>*]:border-slate-200 max-sm:[&>*+*]:border-t sm:[&>*:nth-child(even)]:border-l sm:[&>*:nth-child(n+3)]:border-t " +
  "lg:[&>*:nth-child(n+3)]:border-t-0 lg:[&>*+*]:border-l";

const ORDER_LABEL = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  PROCESSING: "Đang xử lý",
  SHIPPING: "Đang giao",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
} as const;

const ROLE_LABEL = { CUSTOMER: "Khách hàng", VENDOR: "Chủ vựa", ADMIN: "Quản trị viên" } as const;
const PRODUCT_LABEL = { ACTIVE: "Đang bán", INACTIVE: "Ngừng bán", DRAFT: "Bản nháp" } as const;

export function AdminDashboardView() {
  const { accessToken, user } = useAuth();
  const [run, setRun] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [lastData, setLastData] = useState<AdminOverview | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    getAdminOverview(accessToken)
      .then((data) => !cancelled && setResult({ run, data }))
      .catch((err) => !cancelled && setResult({ run, error: err instanceof Error ? err.message : "Không tải được số liệu." }));
    return () => {
      cancelled = true;
    };
  }, [accessToken, run]);

  // Keep the previous figures on screen while a refresh is in flight.
  if (result && "data" in result && result.data !== lastData) setLastData(result.data);

  const refreshing = !result || result.run !== run;
  const error = result && result.run === run && "error" in result ? result.error : null;
  const data = lastData;

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Tổng quan</h1>
          <p className="mt-1 text-sm text-slate-500">
            {greeting()}, {user?.fullName ?? "quản trị viên"}
            {data && <> · cập nhật lúc {new Date(data.generatedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</>}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRun((value) => value + 1)}
          disabled={refreshing}
          className="inline-flex h-9 items-center gap-2 self-start rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Làm mới
        </button>
      </div>

      {data && data.vendors.byStatus.PENDING > 0 && (
        <Link
          href="/admin/vendors"
          className="group mt-5 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 transition-colors hover:bg-amber-100/70"
        >
          <span>
            <span className="font-semibold">{formatCount(data.vendors.byStatus.PENDING)} vựa</span> đang chờ duyệt
          </span>
          <span className="inline-flex items-center gap-1 font-medium">
            Xem danh sách
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      )}

      {error && !data ? (
        <p role="alert" className="mt-8 rounded-xl border border-dashed border-red-200 p-10 text-center text-sm text-danger">
          {error}
        </p>
      ) : !data ? (
        <div className="mt-6 space-y-4" aria-busy>
          <div className={KPI_STRIP}>
            {Array.from({ length: 4 }, (_, index) => (
              <StatTileSkeleton key={index} />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-3" aria-hidden>
            <div className="shimmer h-80 rounded-2xl lg:col-span-2" />
            <div className="shimmer h-80 rounded-2xl" />
          </div>
        </div>
      ) : (
        <div className={`animate-fade-in mt-5 space-y-4 transition-opacity ${refreshing ? "opacity-70" : ""}`}>
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
              {error} Đang hiển thị số liệu lần tải trước.
            </p>
          )}

          <section aria-label="Chỉ số chính" className={KPI_STRIP}>
            <StatTile
              label="Doanh thu"
              value={data.revenue.net}
              format={formatVnd}
              icon={<Wallet className="h-4 w-4" />}
              meta={
                <>
                  <span className="whitespace-nowrap">Đã thu {formatVnd(data.revenue.paid)}</span> ·{" "}
                  <span className="whitespace-nowrap">hoàn {formatVnd(data.revenue.refunded)}</span>
                </>
              }
            />
            <StatTile
              label="Đơn hàng"
              value={data.orders.total}
              format={formatCount}
              icon={<Receipt className="h-4 w-4" />}
              meta={`${formatCount(data.orders.placedLast30Days)} đơn trong 30 ngày qua`}
            />
            <StatTile
              label="Người dùng"
              value={data.users.total}
              format={formatCount}
              icon={<Users className="h-4 w-4" />}
              meta={`${formatCount(data.users.byRole.CUSTOMER)} khách hàng · ${formatCount(data.users.byRole.VENDOR)} chủ vựa`}
            />
            <StatTile
              label="Sản phẩm"
              value={data.products.total}
              format={formatCount}
              icon={<Package className="h-4 w-4" />}
              meta={`${formatCount(data.products.byStatus.ACTIVE)} đang bán`}
            />
          </section>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card title="Doanh thu 6 tháng gần nhất" subtitle="Đã thu trừ hoàn tiền, theo ngày thanh toán" className="lg:col-span-2">
              <RevenueChart months={data.revenue.monthly} />
            </Card>

            <Card title="Đơn hàng theo trạng thái" subtitle={`${formatCount(data.orders.total)} đơn tổng cộng`}>
              <BreakdownBars
                label="Đơn hàng theo trạng thái"
                rows={(Object.keys(ORDER_LABEL) as Array<keyof typeof ORDER_LABEL>).map((key) => ({
                  label: ORDER_LABEL[key],
                  value: data.orders.byStatus[key],
                }))}
              />
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card title="Vựa đối tác" subtitle={`${formatCount(data.vendors.total)} vựa đã đăng ký`}>
              <ul className="divide-y divide-slate-100" aria-label="Vựa theo trạng thái">
                {(["ACTIVE", "PENDING", "SUSPENDED", "REJECTED"] as const).map((status) => (
                  <li key={status} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="sr-only">{STATUS_LABEL[status]}</span>
                    <VendorStatusBadge status={status} />
                    <span className="font-semibold text-slate-900 tabular-nums">{formatCount(data.vendors.byStatus[status])}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="Người dùng" subtitle={`${formatCount(data.users.byStatus.ACTIVE)} tài khoản đang hoạt động`}>
              <BreakdownBars
                label="Người dùng theo vai trò"
                rows={(Object.keys(ROLE_LABEL) as Array<keyof typeof ROLE_LABEL>).map((key) => ({
                  label: ROLE_LABEL[key],
                  value: data.users.byRole[key],
                }))}
              />
            </Card>

            <Card title="Sản phẩm" subtitle={`${formatCount(data.products.total)} sản phẩm trong danh mục`}>
              <BreakdownBars
                label="Sản phẩm theo trạng thái"
                rows={(Object.keys(PRODUCT_LABEL) as Array<keyof typeof PRODUCT_LABEL>).map((key) => ({
                  label: PRODUCT_LABEL[key],
                  value: data.products.byStatus[key],
                }))}
              />
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

function Card({
  title,
  subtitle,
  className = "",
  children,
}: {
  title: string;
  subtitle?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-5 sm:p-6 ${className}`}>
      <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return "Chào buổi sáng";
  if (hour < 14) return "Chào buổi trưa";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}
