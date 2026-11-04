"use client";

import { FormEvent, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Search, Store } from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { getAdminVendors } from "../api/admin-vendor.api";
import { STATUS_LABEL, formatDateTime } from "../constants/vendor-status";
import { AdminVendorList, AdminVendorStatus } from "../types/admin-vendor.types";
import { VendorDetailDialog } from "./VendorDetailDialog";
import { VendorStatusBadge } from "./VendorStatusBadge";

type Tab = AdminVendorStatus | "ALL";

const TABS: Tab[] = ["PENDING", "ACTIVE", "SUSPENDED", "REJECTED", "ALL"];

type Result = { key: string; data: AdminVendorList } | { key: string; error: string };

export function AdminVendorsView() {
  const { accessToken } = useAuth();
  const [tab, setTab] = useState<Tab>("PENDING");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const key = `${tab}|${query}|${page}|${refresh}`;

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    getAdminVendors(accessToken, { status: tab === "ALL" ? undefined : tab, q: query || undefined, page })
      .then((data) => !cancelled && setResult({ key, data }))
      .catch((err) => !cancelled && setResult({ key, error: err instanceof Error ? err.message : "Không tải được danh sách." }));
    return () => {
      cancelled = true;
    };
  }, [accessToken, tab, query, page, key]);

  // Keep the last good data on screen while a new request is in flight.
  const [lastData, setLastData] = useState<AdminVendorList | null>(null);
  if (result && "data" in result && result.data !== lastData) setLastData(result.data);

  const loading = !result || result.key !== key;
  const error = result && result.key === key && "error" in result ? result.error : null;
  const data = lastData;

  const changeTab = (next: Tab) => {
    setTab(next);
    setPage(1);
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setQuery(search.trim());
    setPage(1);
  };

  const count = (value: Tab) => (data ? (value === "ALL" ? data.counts.total : data.counts[value]) : null);

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-sky-700">Quản trị</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Duyệt và quản lý vựa</h1>
          <p className="mt-1 text-sm text-slate-500">
            Xem đăng ký mới, duyệt hoặc từ chối, khóa và mở khóa gian hàng.
          </p>
        </div>

        <form onSubmit={submitSearch} role="search" className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tên vựa, chủ vựa, email"
            aria-label="Tìm vựa"
            className="h-10 w-full rounded-lg border border-slate-300 bg-white pr-3 pl-9 text-sm outline-none transition-colors focus:border-[#0F3860] focus:ring-2 focus:ring-[#0F3860]/15"
          />
        </form>
      </div>

      <div role="tablist" aria-label="Trạng thái vựa" className="mt-6 flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((value) => {
          const active = tab === value;
          const total = count(value);
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => changeTab(value)}
              className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                active
                  ? "border-[#0F3860] text-[#0F3860]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {value === "ALL" ? "Tất cả" : STATUS_LABEL[value]}
              {total !== null && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    value === "PENDING" && total > 0 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {total}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-5" aria-busy={loading}>
        {error ? (
          <p role="alert" className="rounded-xl border border-dashed border-red-200 p-10 text-center text-sm text-[#C62835]">
            {error}
          </p>
        ) : !data ? (
          <div className="flex justify-center py-16 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : data.items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 px-6 py-14 text-center">
            <Store className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-3 font-semibold text-slate-800">Không có vựa nào</p>
            <p className="mt-1 text-sm text-slate-500">
              {query ? "Thử từ khóa khác hoặc chọn tab Tất cả." : "Chưa có vựa ở trạng thái này."}
            </p>
          </div>
        ) : (
          <div className={`transition-opacity ${loading ? "opacity-60" : ""}`}>
            <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {data.items.map((vendor) => (
                <li key={vendor.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(vendor.id)}
                    className="grid w-full gap-x-6 gap-y-1 p-4 text-left transition-colors hover:bg-slate-50 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_9rem_8rem] sm:items-center sm:p-5"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-slate-900">{vendor.name}</span>
                      <span className="block truncate text-xs text-slate-500">{vendor.location}</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-slate-800">{vendor.owner.fullName}</span>
                      <span className="block truncate text-xs text-slate-500">{vendor.owner.email}</span>
                    </span>
                    <span className="text-xs text-slate-500">{formatDateTime(vendor.createdAt)}</span>
                    <span className="sm:text-right">
                      <VendorStatusBadge status={vendor.status} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            {data.pagination.totalPages > 1 && (
              <nav aria-label="Phân trang" className="mt-4 flex items-center justify-between text-sm text-slate-600">
                <span>
                  Trang {data.pagination.page}/{data.pagination.totalPages} · {data.pagination.totalItems} vựa
                </span>
                <span className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                    disabled={page <= 1}
                    aria-label="Trang trước"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 transition-colors hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((value) => Math.min(data.pagination.totalPages, value + 1))}
                    disabled={page >= data.pagination.totalPages}
                    aria-label="Trang sau"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 transition-colors hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </span>
              </nav>
            )}
          </div>
        )}
      </div>

      {openId && (
        <VendorDetailDialog
          key={openId}
          vendorId={openId}
          onClose={() => setOpenId(null)}
          onDecided={() => setRefresh((value) => value + 1)}
        />
      )}
    </>
  );
}
