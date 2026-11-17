"use client";

import { ReactNode, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Search,
  ShieldCheck,
  ShieldHalf,
  ShoppingCart,
  Store,
  TriangleAlert,
  Users,
} from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { getAdminUsers } from "../api/admin-user.api";
import { STATUS_LABEL } from "../constants/vendor-status";
import { AdminUser, AdminUserList, AdminUserRole, AdminUserStatus } from "../types/admin-user.types";
import { AdminVendorStatus } from "../types/admin-vendor.types";
import { formatCount, formatVnd } from "../utils/format";

type Result = { key: string; data: AdminUserList } | { key: string; error: string };

const PAGE_SIZES = [20, 50];
const SEARCH_DELAY_MS = 350;

const ROLE_META: Record<AdminUserRole, { label: string; code: string; className: string }> = {
  CUSTOMER: { label: "Khách hàng", code: "KH", className: "bg-sky-100 text-sky-800" },
  VENDOR: { label: "Chủ vựa", code: "VU", className: "bg-emerald-50 text-emerald-800" },
  ADMIN: { label: "Quản trị viên", code: "QT", className: "bg-slate-200 text-slate-800" },
};

const STATUS_META: Record<AdminUserStatus, { label: string; className: string; dot: string }> = {
  ACTIVE: { label: "Hoạt động", className: "bg-emerald-50 text-emerald-800", dot: "bg-emerald-600" },
  INACTIVE: { label: "Ngừng hoạt động", className: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
  SUSPENDED: { label: "Tạm khóa", className: "bg-red-50 text-red-800", dot: "bg-[#C62835]" },
};

const FILTER_FIELD =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-brand-ink focus:ring-2 focus:ring-brand-ink/15";

/** Short reference built from the real id, e.g. #KH-1A2B3C. */
function shortCode(user: AdminUser): string {
  return `#${ROLE_META[user.role].code}-${user.id.slice(0, 6).toUpperCase()}`;
}

/** 1 2 3 … 9 around the current page. */
function pageNumbers(page: number, total: number): Array<number | "gap"> {
  const wanted = [...new Set([1, page - 1, page, page + 1, total])].filter((value) => value >= 1 && value <= total).sort((a, b) => a - b);
  const result: Array<number | "gap"> = [];
  wanted.forEach((value, index) => {
    if (index > 0 && value - wanted[index - 1]! > 1) result.push("gap");
    result.push(value);
  });
  return result;
}

export function AdminUsersView() {
  const { accessToken } = useAuth();
  const [role, setRole] = useState<AdminUserRole | "">("");
  const [status, setStatus] = useState<AdminUserStatus | "">("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZES[0]!);
  const [result, setResult] = useState<Result | null>(null);
  const [lastData, setLastData] = useState<AdminUserList | null>(null);

  const key = `${role}|${status}|${query}|${page}|${limit}`;

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    getAdminUsers(accessToken, { role: role || undefined, status: status || undefined, q: query || undefined, page, limit })
      .then((data) => !cancelled && setResult({ key, data }))
      .catch((err) => !cancelled && setResult({ key, error: err instanceof Error ? err.message : "Không tải được danh sách tài khoản." }));
    return () => {
      cancelled = true;
    };
  }, [accessToken, role, status, query, page, limit, key]);

  // Search shortly after typing stops, not on every key.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [search]);

  // Keep the last good data on screen while a new request is in flight.
  if (result && "data" in result && result.data !== lastData) setLastData(result.data);

  const loading = !result || result.key !== key;
  const error = result && result.key === key && "error" in result ? result.error : null;
  const data = lastData;
  const counts = data?.counts;
  const filtered = Boolean(role || status || search);

  const changeRole = (value: AdminUserRole | "") => {
    setRole(value);
    setPage(1);
  };
  const changeStatus = (value: AdminUserStatus | "") => {
    setStatus(value);
    setPage(1);
  };
  const reset = () => {
    setRole("");
    setStatus("");
    setSearch("");
    setQuery("");
    setPage(1);
  };

  const first = data && data.pagination.totalItems > 0 ? (data.pagination.page - 1) * data.pagination.limit + 1 : 0;
  const last = data ? Math.min(data.pagination.page * data.pagination.limit, data.pagination.totalItems) : 0;

  return (
    <>
      <div>
        <p className="flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-500 uppercase">
          <span className="h-2 w-2 rounded-full bg-[#C62835]" aria-hidden />
          Tài khoản trên sàn
        </p>
        <h1 className="mt-2 max-w-3xl text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Quản lý tài khoản khách hàng, đối tác và quản trị viên
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Tra cứu tài khoản theo vai trò và trạng thái, xem nhanh giá trị đơn hàng và gian hàng của từng người.
        </p>
      </div>

      <section aria-label="Số liệu tài khoản" className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile
          label="Tổng người dùng"
          value={counts?.total}
          icon={<Users className="h-5 w-5" />}
          tone="bg-sky-50 text-brand-ink"
          meta={counts && `${formatCount(counts.newLast30Days)} tài khoản mới trong 30 ngày`}
        />
        <Tile
          label="Khách hàng"
          value={counts?.byRole.CUSTOMER}
          icon={<ShoppingCart className="h-5 w-5" />}
          tone="bg-sky-100 text-brand-ink"
          meta={counts && counts.total > 0 ? `${Math.round((counts.byRole.CUSTOMER / counts.total) * 100)}% tổng tài khoản` : undefined}
        />
        <Tile
          label="Chủ vựa"
          value={counts?.byRole.VENDOR}
          icon={<Store className="h-5 w-5" />}
          tone="bg-emerald-50 text-emerald-800"
          meta={counts && `${formatCount(counts.activeVendors)} gian hàng đang hoạt động`}
        />
        <Tile
          label="Quản trị viên"
          value={counts?.byRole.ADMIN}
          icon={<ShieldHalf className="h-5 w-5" />}
          tone="bg-red-50 text-red-800"
          meta={counts && `${formatCount(counts.byStatus.SUSPENDED)} tài khoản đang tạm khóa`}
        />
      </section>

      <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white" aria-busy={loading}>
        <div className="grid gap-3 bg-sky-50 p-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <div role="search" className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo họ tên, email, số điện thoại"
              aria-label="Tìm tài khoản"
              className={`${FILTER_FIELD} pl-9 placeholder:text-slate-400`}
            />
          </div>
          <select aria-label="Lọc theo vai trò" value={role} onChange={(event) => changeRole(event.target.value as AdminUserRole | "")} className={FILTER_FIELD}>
            <option value="">Tất cả vai trò</option>
            {(Object.keys(ROLE_META) as AdminUserRole[]).map((value) => (
              <option key={value} value={value}>{ROLE_META[value].label}</option>
            ))}
          </select>
          <select aria-label="Lọc theo trạng thái" value={status} onChange={(event) => changeStatus(event.target.value as AdminUserStatus | "")} className={FILTER_FIELD}>
            <option value="">Tất cả trạng thái</option>
            {(Object.keys(STATUS_META) as AdminUserStatus[]).map((value) => (
              <option key={value} value={value}>{STATUS_META[value].label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={reset}
            disabled={!filtered}
            aria-label="Xóa bộ lọc"
            title="Xóa bộ lọc"
            className="flex h-10 w-10 items-center justify-center justify-self-start rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors enabled:hover:bg-slate-100 disabled:opacity-40"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-y border-slate-200 px-4 py-2.5 text-sm">
          <span className="font-medium text-slate-600">Bộ lọc nhanh:</span>
          <QuickFilter active={!role && !status} onClick={() => { changeRole(""); changeStatus(""); }}>
            Tất cả ({formatCount(counts?.total ?? 0)})
          </QuickFilter>
          <QuickFilter active={status === "SUSPENDED"} danger onClick={() => changeStatus("SUSPENDED")}>
            Tài khoản tạm khóa ({formatCount(counts?.byStatus.SUSPENDED ?? 0)})
          </QuickFilter>
          <span className="ml-auto text-xs text-slate-500 tabular-nums">
            Hiển thị {formatCount(first)} - {formatCount(last)} trên {formatCount(data?.pagination.totalItems ?? 0)}
          </span>
        </div>

        {error && !data ? (
          <p role="alert" className="p-10 text-center text-sm text-danger">{error}</p>
        ) : !data ? (
          <div aria-hidden>
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="flex items-center gap-4 border-b border-slate-100 p-4 last:border-0">
                <div className="shimmer h-11 w-11 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="shimmer h-4 w-1/4 rounded" />
                  <div className="shimmer h-3 w-1/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : data.items.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Users className="h-7 w-7" />
            </span>
            <p className="mt-3 font-semibold text-slate-800">Không tìm thấy tài khoản nào</p>
            <p className="mt-1 text-sm text-slate-500">Thử từ khóa khác hoặc xóa bộ lọc.</p>
          </div>
        ) : (
          <div className={`transition-opacity ${loading ? "opacity-60" : ""}`}>
            {error && <p role="alert" className="bg-red-50 px-4 py-2 text-sm text-danger">{error} Đang hiển thị danh sách lần tải trước.</p>}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] table-fixed text-sm">
                <caption className="sr-only">Danh sách tài khoản</caption>
                <thead className="bg-sky-50 text-left text-[11px] font-semibold tracking-wider text-slate-600 uppercase">
                  <tr>
                    <th scope="col" className="w-28 px-4 py-3">Mã</th>
                    <th scope="col" className="px-4 py-3">Người dùng</th>
                    <th scope="col" className="px-4 py-3">Email</th>
                    <th scope="col" className="w-32 px-4 py-3">Vai trò</th>
                    <th scope="col" className="w-28 px-3 py-3">Ngày đăng ký</th>
                    <th scope="col" className="w-48 px-3 py-3">Đơn hàng / gian hàng</th>
                    <th scope="col" className="w-36 px-4 py-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((user) => (
                    <UserRow key={user.id} user={user} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {data && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-sky-50 px-4 py-3 text-sm">
            <label className="flex items-center gap-2 text-slate-600">
              Xem mỗi trang:
              <select
                value={limit}
                onChange={(event) => {
                  setLimit(Number(event.target.value));
                  setPage(1);
                }}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-900 outline-none focus:border-brand-ink"
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>{size} kết quả</option>
                ))}
              </select>
            </label>
            <nav aria-label="Phân trang" className="flex items-center gap-1">
              <PageButton label="Trang trước" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </PageButton>
              {pageNumbers(data.pagination.page, data.pagination.totalPages).map((value, index) =>
                value === "gap" ? (
                  <span key={`gap-${index}`} className="px-1 text-slate-500" aria-hidden>…</span>
                ) : (
                  <PageButton key={value} label={`Trang ${value}`} current={value === data.pagination.page} onClick={() => setPage(value)}>
                    {value}
                  </PageButton>
                ),
              )}
              <PageButton label="Trang sau" disabled={page >= data.pagination.totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </PageButton>
            </nav>
          </div>
        )}
      </section>
    </>
  );
}

function Tile({
  label,
  value,
  icon,
  tone,
  meta,
}: {
  label: string;
  value: number | undefined;
  icon: ReactNode;
  tone: string;
  meta?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">{label}</p>
          {value === undefined ? (
            <div className="shimmer mt-2 h-8 w-20 rounded" aria-hidden />
          ) : (
            <p className="mt-1.5 text-3xl font-bold tracking-tight text-slate-900 tabular-nums">{formatCount(value)}</p>
          )}
        </div>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${tone}`} aria-hidden>
          {icon}
        </span>
      </div>
      {meta && <p className="mt-3 text-xs text-slate-500">{meta}</p>}
    </div>
  );
}

function QuickFilter({ active, danger = false, onClick, children }: { active: boolean; danger?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
        active ? "bg-sky-100 text-sky-800" : danger ? "text-danger hover:bg-red-50" : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

function PageButton({
  label,
  current = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  current?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={current ? "page" : undefined}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-9 min-w-9 items-center justify-center rounded-lg px-2 font-medium tabular-nums transition-colors disabled:opacity-40 ${
        current ? "bg-brand text-[#fff]" : "bg-white text-slate-700 enabled:hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

function UserAvatar({ user }: { user: AdminUser }) {
  const [broken, setBroken] = useState(false);
  return (
    <span className="relative shrink-0">
      {user.avatarUrl && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatarUrl} alt="" loading="lazy" onError={() => setBroken(true)} className="h-11 w-11 rounded-full object-cover" />
      ) : (
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-brand-ink" aria-hidden>
          {user.fullName.trim().charAt(0).toUpperCase()}
        </span>
      )}
      <span className={`absolute right-0 bottom-0 h-3 w-3 rounded-full ring-2 ring-white ${STATUS_META[user.status].dot}`} aria-hidden />
    </span>
  );
}

function UserRow({ user }: { user: AdminUser }) {
  const suspended = user.status === "SUSPENDED";
  const role = ROLE_META[user.role];
  const status = STATUS_META[user.status];
  const date = new Date(user.createdAt);

  return (
    <tr className={`transition-colors ${suspended ? "bg-red-50" : "hover:bg-slate-50"}`}>
      <td className={`px-4 py-4 font-mono text-xs font-semibold whitespace-nowrap ${suspended ? "text-danger" : "text-slate-700"}`}>
        {shortCode(user)}
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <UserAvatar user={user} />
          <div className="min-w-0">
            <p className="font-semibold break-words text-slate-900">
              {user.fullName}
              {user.role === "ADMIN" && <ShieldCheck className="ml-1 inline h-3.5 w-3.5 text-brand-ink" aria-hidden />}
            </p>
            <p className="font-mono text-xs text-slate-500">{user.phone ?? "Chưa có số điện thoại"}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4 text-slate-700">
        <p className="break-words">{user.email}</p>
        {suspended && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-danger">
            <TriangleAlert className="h-3 w-3" aria-hidden />
            Đang tạm ngưng truy cập
          </p>
        )}
      </td>
      <td className="px-4 py-4">
        <span className={`inline-block rounded px-2 py-1 text-xs font-semibold whitespace-nowrap ${role.className}`}>{role.label}</span>
      </td>
      <td className="px-3 py-4 whitespace-nowrap">
        <p className="text-slate-800 tabular-nums">{date.toLocaleDateString("vi-VN")}</p>
        <p className="text-xs text-slate-500 tabular-nums">{date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</p>
      </td>
      <td className="px-3 py-4">
        {user.vendor && (
          <p className="flex gap-1.5 font-semibold text-slate-900">
            <Store className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
            {user.vendor.name}
          </p>
        )}
        {user.vendor && (
          <p className="text-xs text-slate-500">{STATUS_LABEL[user.vendor.status as AdminVendorStatus] ?? user.vendor.status}</p>
        )}
        {user.orderCount > 0 ? (
          <>
            <p className="font-semibold whitespace-nowrap text-slate-900 tabular-nums">{formatVnd(user.orderTotal)}</p>
            <p className="text-xs text-slate-500">{formatCount(user.orderCount)} đơn đã đặt</p>
          </>
        ) : (
          !user.vendor && <p className="text-slate-400">Chưa có đơn</p>
        )}
      </td>
      <td className="px-4 py-4">
        <span className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-semibold whitespace-nowrap ${status.className}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} aria-hidden />
          {status.label}
        </span>
      </td>
    </tr>
  );
}
