"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Ban,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ImageIcon,
  Info,
  Receipt,
  RotateCw,
  Store,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ApiError } from "@/features/auth/api/auth.api";
import { useAuth } from "@/features/auth/context/AuthContext";
import { VENDOR_ORDER_STATUS } from "@/features/order/constants/order-status";
import { cn, formatPrice } from "@/lib/utils";
import { getMyStats } from "../api/vendor-stats.api";
import { REVENUE_DATE_RULE, REVENUE_RULE } from "../constants/revenue";
import { VENDOR_REGISTER_PATH } from "../constants/store-status";
import type { StatsRange, VendorStats, VendorStatsQuery, VendorStatsTopProduct } from "../types/vendor-stats.types";
import { STATS_RANGES } from "../types/vendor-stats.types";
import {
  RANGE_LABELS,
  describeDay,
  formatAmount,
  formatPercent,
  readStatsQuery,
  vietnamToday,
} from "../utils/vendor-stats";
import { RevenueBarChart } from "./RevenueBarChart";
import { VendorPageHeader } from "./VendorPageHeader";
import { fieldClass } from "./VendorDialog";

type Loaded =
  | { key: string; kind: "ready"; stats: VendorStats }
  | { key: string; kind: "no-store" }
  | { key: string; kind: "error"; message: string };

/** Revenue, completed and cancelled orders, a daily chart and best sellers for a period kept on the URL. */
export function VendorStatisticsView() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = readStatsQuery(searchParams);
  const { range, from, to } = query;
  const needsDates = range === "custom" && (!from || !to);

  const [reloadCount, setReloadCount] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const key = JSON.stringify({ ...query, reloadCount });
  const current = loaded?.key === key ? loaded : null;

  useEffect(() => {
    if (!accessToken || needsDates) return;
    let active = true;
    getMyStats(accessToken, { range, from, to })
      .then((stats) => active && setLoaded({ key, kind: "ready", stats }))
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof ApiError && error.statusCode === 404) setLoaded({ key, kind: "no-store" });
        else setLoaded({ key, kind: "error", message: error instanceof Error ? error.message : "Không thể tải số liệu thống kê." });
      });
    return () => {
      active = false;
    };
  }, [accessToken, key, needsDates, range, from, to]);

  function choose(next: VendorStatsQuery) {
    const search = new URLSearchParams({ range: next.range });
    if (next.range === "custom") {
      if (next.from) search.set("from", next.from);
      if (next.to) search.set("to", next.to);
    }
    router.replace(`${pathname}?${search}`, { scroll: false });
  }

  return (
    <>
      <VendorPageHeader
        title="Thống kê và doanh thu"
        description="Theo dõi doanh thu, đơn hàng và sản phẩm bán chạy của gian hàng."
      />

      <section aria-label="Kỳ thống kê" className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <p className="flex max-w-2xl gap-2 text-sm text-slate-600">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
            <span>
              {REVENUE_RULE} {REVENUE_DATE_RULE}
            </span>
          </p>
          <RangePicker query={query} onChange={choose} />
        </div>
        {current?.kind === "ready" && <PeriodLine stats={current.stats} />}
      </section>

      {needsDates ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">
          Chọn ngày bắt đầu và ngày kết thúc rồi bấm &quot;Xem&quot; để xem số liệu.
        </p>
      ) : !current ? (
        <StatsSkeleton />
      ) : current.kind === "no-store" ? (
        <NoStore />
      ) : current.kind === "error" ? (
        <section role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
          <h2 className="font-bold">Không thể tải số liệu thống kê</h2>
          <p className="mt-1">{current.message}</p>
          <button
            type="button"
            onClick={() => setReloadCount((count) => count + 1)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-800 transition-colors hover:bg-rose-100"
          >
            <RotateCw className="h-3.5 w-3.5" aria-hidden />
            Thử lại
          </button>
        </section>
      ) : (
        <StatsBody stats={current.stats} />
      )}
    </>
  );
}

function RangePicker({ query, onChange }: { query: VendorStatsQuery; onChange: (next: VendorStatsQuery) => void }) {
  const [customOpen, setCustomOpen] = useState(query.range === "custom");
  const [from, setFrom] = useState(query.from ?? "");
  const [to, setTo] = useState(query.to ?? "");
  const today = vietnamToday();
  const showCustom = customOpen || query.range === "custom";

  function pick(range: StatsRange) {
    if (range === "custom") {
      setCustomOpen(true);
      return;
    }
    setCustomOpen(false);
    onChange({ range });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    onChange({ range: "custom", from, to });
  }

  return (
    <div className="min-w-0 space-y-3 xl:max-w-xl">
      <div role="group" aria-label="Chọn kỳ thống kê" className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
        {STATS_RANGES.map((range) => {
          const active = range === "custom" ? showCustom : !showCustom && query.range === range;
          return (
            <button
              key={range}
              type="button"
              aria-pressed={active}
              onClick={() => pick(range)}
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors",
                active ? "bg-brand text-white" : "text-slate-600 hover:bg-white hover:text-slate-900",
              )}
            >
              {range === "custom" && <CalendarDays className="h-4 w-4" aria-hidden />}
              {RANGE_LABELS[range]}
            </button>
          );
        })}
      </div>

      {showCustom && (
        <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
          <label className="min-w-36 flex-1 text-xs font-semibold text-slate-600">
            Từ ngày
            <input type="date" required value={from} max={to || today} onChange={(event) => setFrom(event.target.value)} className={fieldClass(false, "mt-1")} />
          </label>
          <label className="min-w-36 flex-1 text-xs font-semibold text-slate-600">
            Đến ngày
            <input type="date" required value={to} min={from || undefined} max={today} onChange={(event) => setTo(event.target.value)} className={fieldClass(false, "mt-1")} />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            Xem
          </button>
        </form>
      )}
    </div>
  );
}

function PeriodLine({ stats }: { stats: VendorStats }) {
  const { period } = stats;
  return (
    <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
      Đang xem <strong className="text-slate-800">{describeDay(period.from).long}</strong> đến{" "}
      <strong className="text-slate-800">{describeDay(period.to).long}</strong> ({period.days} ngày), so với kỳ trước{" "}
      {describeDay(period.previousFrom).long} đến {describeDay(period.previousTo).long}.
    </p>
  );
}

function StatsBody({ stats }: { stats: VendorStats }) {
  const { summary, period } = stats;
  return (
    <div className="space-y-6">
      <section aria-label="Số liệu trong kỳ" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Banknote}
          label="Doanh thu"
          value={formatPrice(Number(summary.revenue.value))}
          previous={formatPrice(Number(summary.revenue.previous))}
          change={summary.revenue.changePercent}
        />
        <MetricCard
          icon={CheckCircle2}
          label="Đơn hoàn tất"
          value={`${summary.completedOrders.value} đơn`}
          previous={`${summary.completedOrders.previous} đơn`}
          change={summary.completedOrders.changePercent}
        />
        <MetricCard
          icon={Receipt}
          label="Giá trị trung bình mỗi đơn"
          value={formatPrice(Number(summary.averageOrderValue.value))}
          previous={formatPrice(Number(summary.averageOrderValue.previous))}
          change={summary.averageOrderValue.changePercent}
        />
        <MetricCard
          icon={Ban}
          label="Tỷ lệ hủy"
          value={formatPercent(summary.cancellationRate.value)}
          previous={formatPercent(summary.cancellationRate.previous)}
          change={summary.cancellationRate.changePercent}
          note={`${summary.cancelledOrders.value} trên ${summary.placedOrders} đơn đặt trong kỳ`}
          lowerIsBetter
        />
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5" aria-labelledby="revenue-chart-title">
          <h2 id="revenue-chart-title" className="text-lg font-bold text-slate-900">Doanh thu theo ngày</h2>
          <p className="mt-0.5 text-sm text-slate-500">Tổng tiền hàng của các đơn hoàn tất trong từng ngày.</p>
          <div className="mt-3">
            <RevenueBarChart
              days={stats.series}
              label={`Doanh thu theo ngày từ ${describeDay(period.from).long} đến ${describeDay(period.to).long}`}
            />
          </div>
        </section>
        <OrderStatusPanel stats={stats} />
      </div>

      <TopProducts products={stats.topProducts} threshold={stats.lowStockThreshold} />
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  previous,
  change,
  note,
  lowerIsBetter = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  previous: string;
  change: number | null;
  note?: string;
  lowerIsBetter?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft/50 text-brand" aria-hidden>
          <Icon className="h-4.5 w-4.5" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold break-words text-slate-900 tabular-nums sm:text-[26px]">{value}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
        <ChangeBadge change={change} lowerIsBetter={lowerIsBetter} />
        <span>Kỳ trước: {previous}</span>
      </div>
      {note && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{note}</p>}
    </div>
  );
}

/** Hidden when the previous period was 0, since there is no percentage to show. */
function ChangeBadge({ change, lowerIsBetter }: { change: number | null; lowerIsBetter: boolean }) {
  if (change === null) return null;
  const up = change > 0;
  const flat = change === 0;
  const good = flat ? null : up !== lowerIsBetter;
  const Arrow = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold tabular-nums",
        good === null ? "bg-slate-100 text-slate-600" : good ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700",
      )}
    >
      {!flat && <Arrow className="h-3.5 w-3.5" aria-hidden />}
      <span className="sr-only">{flat ? "Không đổi" : up ? "Tăng" : "Giảm"} </span>
      {formatPercent(Math.abs(change))}
    </span>
  );
}

function OrderStatusPanel({ stats }: { stats: VendorStats }) {
  const placed = stats.summary.placedOrders;
  const completed = stats.ordersByStatus.find((row) => row.status === "COMPLETED")?.count ?? 0;
  const completionRate = placed === 0 ? 0 : Math.round((completed / placed) * 1000) / 10;

  return (
    <section className="min-w-0 self-start rounded-2xl border border-slate-200 bg-white p-5" aria-labelledby="order-status-title">
      <div className="flex items-start justify-between gap-3">
        <h2 id="order-status-title" className="text-lg font-bold text-slate-900">Tình trạng đơn hàng</h2>
        <span className="shrink-0 text-xs text-slate-500">{placed} đơn đặt trong kỳ</span>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm text-slate-600">Tỷ lệ hoàn tất</p>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">{formatPercent(completionRate)}</p>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-label="Tỷ lệ hoàn tất"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={completionRate}
        >
          <div className="grow-x h-full rounded-full bg-emerald-500" style={{ width: `${completionRate}%` }} />
        </div>
      </div>

      <ul className="mt-5 space-y-2">
        {stats.ordersByStatus.map(({ status, count }) => {
          const style = VENDOR_ORDER_STATUS[status];
          const share = placed === 0 ? 0 : Math.round((count / placed) * 1000) / 10;
          return (
            <li key={status}>
              <Link
                href={`/vendor/orders?status=${status}`}
                className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-sm transition-colors hover:bg-slate-100"
              >
                <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset", style.className)}>{style.label}</span>
                <span className="text-right tabular-nums">
                  <span className="font-bold text-slate-900">{count} đơn</span>
                  <span className="ml-2 text-xs text-slate-500">{formatPercent(share)}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-slate-500">Đếm theo ngày đặt đơn và trạng thái hiện tại. Bấm vào một dòng để xem các đơn đó.</p>
    </section>
  );
}

function TopProducts({ products, threshold }: { products: VendorStatsTopProduct[]; threshold: number }) {
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white" aria-labelledby="top-products-title">
      <div className="p-5">
        <h2 id="top-products-title" className="text-lg font-bold text-slate-900">Sản phẩm bán chạy</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Tối đa 5 sản phẩm có doanh thu cao nhất trong các đơn hoàn tất của kỳ. Tỷ trọng tính trên tổng tiền hàng của kỳ.
        </p>
      </div>

      {products.length === 0 ? (
        <p className="mx-5 mb-5 rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">Chưa có sản phẩm nào bán được trong kỳ này.</p>
      ) : (
        <>
          <div className="hidden md:block">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">Sản phẩm và quy cách</th>
                  <th scope="col" className="w-[14%] px-3 py-3 text-right font-semibold">Đã bán</th>
                  <th scope="col" className="w-[20%] px-3 py-3 text-right font-semibold">Doanh thu</th>
                  <th scope="col" className="w-[16%] px-3 py-3 font-semibold">Tồn kho hiện tại</th>
                  <th scope="col" className="w-[12%] px-5 py-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((product, index) => (
                  <tr key={`${product.offerId}-${product.unit}`} className="align-middle">
                    <td className="px-5 py-3">
                      <ProductCell product={product} rank={index + 1} />
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-slate-900 tabular-nums">
                      {formatAmount(product.quantitySold)} {product.unit}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      <p className="font-bold text-slate-900">{formatPrice(Number(product.revenue))}</p>
                      <p className="text-xs text-slate-500">{formatPercent(product.sharePercent)} tổng tiền hàng</p>
                    </td>
                    <td className="px-3 py-3">
                      <StockBadge product={product} threshold={threshold} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <ManageLink />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-slate-100 border-t border-slate-100 md:hidden">
            {products.map((product, index) => (
              <li key={`${product.offerId}-${product.unit}`} className="space-y-3 px-5 py-4">
                <ProductCell product={product} rank={index + 1} />
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-slate-500">Đã bán</dt>
                    <dd className="font-semibold text-slate-900 tabular-nums">
                      {formatAmount(product.quantitySold)} {product.unit}
                    </dd>
                  </div>
                  <div className="text-right">
                    <dt className="text-xs text-slate-500">Doanh thu ({formatPercent(product.sharePercent)})</dt>
                    <dd className="font-bold text-slate-900 tabular-nums">{formatPrice(Number(product.revenue))}</dd>
                  </div>
                </dl>
                <div className="flex items-center justify-between gap-3">
                  <StockBadge product={product} threshold={threshold} />
                  <ManageLink />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function ProductCell({ product, rank }: { product: VendorStatsTopProduct; rank: number }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="w-4 shrink-0 text-center text-xs font-bold text-slate-400 tabular-nums">{rank}</span>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-slate-400">
        {product.imageUrl ? (
          // Product images come from Cloudinary or seed URLs; next/image is not set up for remote hosts.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="h-5 w-5" aria-hidden />
        )}
      </span>
      <div className="min-w-0">
        <p className="font-semibold break-words text-slate-900">{product.productName}</p>
        {product.variantName && product.variantName !== product.productName && (
          <p className="mt-0.5 text-xs break-words text-slate-500">{product.variantName}</p>
        )}
        <p className="mt-0.5 text-xs text-slate-500">Đơn vị: {product.unit}</p>
      </div>
    </div>
  );
}

function StockBadge({ product, threshold }: { product: VendorStatsTopProduct; threshold: number }) {
  if (product.stock === null) {
    return <span className="text-xs text-slate-500">Không còn trong gian hàng</span>;
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-sm">
      <span className="font-semibold text-slate-900 tabular-nums">
        {formatAmount(product.stock)} {product.unit}
      </span>
      {product.isLowStock && (
        <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200 ring-inset" title={`Còn từ ${threshold} trở xuống`}>
          Sắp hết
        </span>
      )}
    </span>
  );
}

/** Price and stock are edited from the product list, so that is where this goes. */
function ManageLink() {
  return (
    <Link href="/vendor/products" className="inline-flex items-center gap-1 text-xs font-semibold whitespace-nowrap text-brand hover:underline">
      Cập nhật kho
      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
    </Link>
  );
}

function NoStore() {
  return (
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
  );
}

export function StatsSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Đang tải số liệu thống kê">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="shimmer h-36 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="shimmer h-80 rounded-2xl" />
        <div className="shimmer h-80 rounded-2xl" />
      </div>
      <div className="shimmer h-64 rounded-2xl" />
      <span className="sr-only">Đang tải số liệu thống kê...</span>
    </div>
  );
}
