"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { decideVendor, getAdminVendor } from "../api/admin-vendor.api";
import {
  ACTIONS_BY_STATUS,
  ACTION_HISTORY_LABEL,
  ACTION_LABEL,
  STATUS_LABEL,
  formatDateTime,
} from "../constants/vendor-status";
import { AdminVendorDetail, VendorDecisionAction } from "../types/admin-vendor.types";
import { AdminDialog } from "./AdminDialog";
import { DecisionDialog } from "./DecisionDialog";
import { VendorStatusBadge } from "./VendorStatusBadge";

interface VendorDetailDialogProps {
  vendorId: string;
  onClose: () => void;
  /** Called after a decision was saved so the list can refresh. */
  onDecided: () => void;
}

type Loaded = { id: string; detail: AdminVendorDetail } | { id: string; error: string };

export function VendorDetailDialog({ vendorId, onClose, onDecided }: VendorDetailDialogProps) {
  const { accessToken } = useAuth();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [pending, setPending] = useState<VendorDecisionAction | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    getAdminVendor(accessToken, vendorId)
      .then((detail) => !cancelled && setLoaded({ id: vendorId, detail }))
      .catch((err) => !cancelled && setLoaded({ id: vendorId, error: err instanceof Error ? err.message : "Không tải được vựa." }));
    return () => {
      cancelled = true;
    };
  }, [accessToken, vendorId]);

  const current = loaded && loaded.id === vendorId ? loaded : null;
  const detail = current && "detail" in current ? current.detail : null;

  const confirm = async (reason?: string) => {
    if (!accessToken || !pending || !detail) return;
    const updated = await decideVendor(accessToken, detail.id, pending, reason);
    setLoaded({ id: vendorId, detail: updated });
    setPending(null);
    onDecided();
  };

  return (
    <>
      <AdminDialog title={detail?.name ?? "Chi tiết vựa"} onClose={onClose} size="lg">
        {!current ? (
          <div className="flex justify-center py-12 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : "error" in current ? (
          <p role="alert" className="py-8 text-center text-sm text-danger">
            {current.error}
          </p>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <VendorStatusBadge status={current.detail.status} />
              {current.detail.status === "ACTIVE" && (
                <a
                  href={`/vendor/${current.detail.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-brand-ink hover:underline"
                >
                  Xem gian hàng
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>

            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <Field label="Chủ vựa" value={`${current.detail.owner.fullName} · ${current.detail.owner.role}`} />
              <Field label="Email chủ vựa" value={current.detail.owner.email} />
              <Field label="Điện thoại" value={current.detail.phone ?? current.detail.owner.phone} />
              <Field label="Email gian hàng" value={current.detail.email} />
              <Field
                label="Địa chỉ"
                value={[current.detail.streetAddress, current.detail.ward, current.detail.district, current.detail.province]
                  .filter(Boolean)
                  .join(", ")}
                wide
              />
              <Field label="Giới thiệu" value={current.detail.description} wide />
              <Field label="Ngày đăng ký" value={formatDateTime(current.detail.createdAt)} />
              <Field label="Hoạt động" value={`${current.detail.offerCount} mặt hàng · ${current.detail.orderCount} đơn`} />
            </dl>

            <section>
              <h3 className="text-sm font-bold text-slate-900">Lịch sử quyết định</h3>
              {current.detail.decisions.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">Chưa có quyết định nào.</p>
              ) : (
                <ol className="mt-3 space-y-3 border-l border-slate-200 pl-4">
                  {current.detail.decisions.map((decision) => (
                    <li key={decision.id} className="text-sm">
                      <p className="font-semibold text-slate-900">
                        {ACTION_HISTORY_LABEL[decision.action]}{" "}
                        <span className="font-normal text-slate-500">
                          ({STATUS_LABEL[decision.fromStatus]} → {STATUS_LABEL[decision.toStatus]})
                        </span>
                      </p>
                      <p className="text-xs text-slate-500">
                        {decision.admin.fullName} · {formatDateTime(decision.createdAt)}
                      </p>
                      {decision.reason && <p className="mt-1 text-slate-700">Lý do: {decision.reason}</p>}
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {ACTIONS_BY_STATUS[current.detail.status].length > 0 && (
              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
                {ACTIONS_BY_STATUS[current.detail.status].map((action) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => setPending(action)}
                    className={`h-10 rounded-lg px-4 text-sm font-semibold transition-colors ${
                      action === "APPROVE" || action === "REACTIVATE"
                        ? "bg-brand text-[#fff] hover:bg-brand-hover"
                        : "border border-red-200 text-danger hover:bg-red-50"
                    }`}
                  >
                    {ACTION_LABEL[action]}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </AdminDialog>

      {pending && detail && (
        <DecisionDialog
          action={pending}
          vendorName={detail.name}
          onCancel={() => setPending(null)}
          onConfirm={confirm}
        />
      )}
    </>
  );
}

function Field({ label, value, wide }: { label: string; value: string | null | undefined; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-slate-900">{value || "—"}</dd>
    </div>
  );
}
