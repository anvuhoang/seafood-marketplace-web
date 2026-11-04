import { STATUS_BADGE, STATUS_LABEL } from "../constants/vendor-status";
import { AdminVendorStatus } from "../types/admin-vendor.types";

export function VendorStatusBadge({ status }: { status: AdminVendorStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${STATUS_BADGE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
