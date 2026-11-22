import type { VendorStorefrontStatus } from "../types/vendor.types";

/** Label and badge colours for each store status, as the vendor sees it. */
export const STORE_STATUS_BADGES: Record<VendorStorefrontStatus, { label: string; className: string }> = {
  ACTIVE: { label: "Đang hoạt động", className: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  PENDING: { label: "Chờ duyệt", className: "bg-amber-50 text-amber-800 ring-amber-200" },
  REJECTED: { label: "Bị từ chối", className: "bg-rose-50 text-rose-800 ring-rose-200" },
  SUSPENDED: { label: "Tạm ngưng", className: "bg-slate-100 text-slate-700 ring-slate-300" },
};

/** Where the existing "open a store" buttons in the header, footer and home page point (issue 15A). */
export const VENDOR_REGISTER_PATH = "/vendor/register";
