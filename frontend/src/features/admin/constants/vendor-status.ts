import { AdminVendorStatus, VendorDecisionAction } from "../types/admin-vendor.types";

export const STATUS_LABEL: Record<AdminVendorStatus, string> = {
  PENDING: "Chờ duyệt",
  ACTIVE: "Đang hoạt động",
  REJECTED: "Bị từ chối",
  SUSPENDED: "Đã khóa",
};

export const STATUS_BADGE: Record<AdminVendorStatus, string> = {
  PENDING: "bg-amber-50 text-amber-800 ring-amber-200",
  ACTIVE: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  REJECTED: "bg-slate-100 text-slate-700 ring-slate-200",
  SUSPENDED: "bg-red-50 text-red-800 ring-red-200",
};

export const ACTION_LABEL: Record<VendorDecisionAction, string> = {
  APPROVE: "Duyệt vựa",
  REJECT: "Từ chối",
  SUSPEND: "Khóa vựa",
  REACTIVATE: "Mở khóa",
};

/** Past-tense wording for the decision history. */
export const ACTION_HISTORY_LABEL: Record<VendorDecisionAction, string> = {
  APPROVE: "Đã duyệt",
  REJECT: "Đã từ chối",
  SUSPEND: "Đã khóa",
  REACTIVATE: "Đã mở khóa",
};

/** Decisions available for each status, in display order. */
export const ACTIONS_BY_STATUS: Record<AdminVendorStatus, VendorDecisionAction[]> = {
  PENDING: ["APPROVE", "REJECT"],
  ACTIVE: ["SUSPEND"],
  SUSPENDED: ["REACTIVATE"],
  REJECTED: [],
};

export const REASON_REQUIRED: VendorDecisionAction[] = ["REJECT", "SUSPEND"];
export const REASON_MIN_LENGTH = 5;
export const REASON_MAX_LENGTH = 500;

/** What each decision does, shown in the confirmation dialog. */
export const ACTION_CONSEQUENCE: Record<VendorDecisionAction, string> = {
  APPROVE: "Gian hàng sẽ hiển thị công khai và chủ vựa được cấp quyền Vendor để quản lý gian hàng.",
  REJECT: "Gian hàng không được mở. Chủ vựa vẫn là khách hàng và sẽ thấy lý do bạn nhập.",
  SUSPEND: "Gian hàng bị ẩn khỏi trang công khai và chủ vựa quay về quyền khách hàng ngay lập tức.",
  REACTIVATE: "Gian hàng hiển thị trở lại và chủ vựa được cấp lại quyền Vendor.",
};

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
