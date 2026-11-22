"use client";

import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  ACTION_CONSEQUENCE,
  ACTION_LABEL,
  REASON_MAX_LENGTH,
  REASON_MIN_LENGTH,
  REASON_REQUIRED,
} from "../constants/vendor-status";
import { VendorDecisionAction } from "../types/admin-vendor.types";
import { AdminDialog } from "./AdminDialog";

interface DecisionDialogProps {
  action: VendorDecisionAction;
  vendorName: string;
  onCancel: () => void;
  /** Resolves when the decision was saved; rejects with a readable message otherwise. */
  onConfirm: (reason?: string) => Promise<void>;
}

/** Confirmation step for every decision. Rejecting or suspending also asks for a reason. */
export function DecisionDialog({ action, vendorName, onCancel, onConfirm }: DecisionDialogProps) {
  const needsReason = REASON_REQUIRED.includes(action);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = reason.trim();
  const reasonTooShort = needsReason && trimmed.length < REASON_MIN_LENGTH;
  const destructive = action === "REJECT" || action === "SUSPEND";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (reasonTooShort || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm(needsReason ? trimmed : undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể thực hiện. Vui lòng thử lại.");
      setBusy(false);
    }
  };

  return (
    <AdminDialog title={`${ACTION_LABEL[action]}?`} onClose={busy ? () => undefined : onCancel}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm leading-relaxed text-slate-700">
          <span className="font-semibold text-slate-900">{vendorName}</span>
          <br />
          {ACTION_CONSEQUENCE[action]}
        </p>

        {needsReason && (
          <div>
            <label htmlFor="decision-reason" className="text-sm font-semibold text-slate-800">
              Lý do <span className="text-danger">*</span>
            </label>
            <textarea
              id="decision-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={REASON_MAX_LENGTH}
              rows={4}
              autoFocus
              className="mt-1.5 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-brand-ink focus:ring-2 focus:ring-brand-ink/15"
              placeholder="Ví dụ: Giấy phép ATTP đã hết hạn, vui lòng bổ sung bản mới."
            />
            <p className="mt-1 text-xs text-slate-500">
              Tối thiểu {REASON_MIN_LENGTH} ký tự · {trimmed.length}/{REASON_MAX_LENGTH}
            </p>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={reasonTooShort || busy}
            className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-[#fff] transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              destructive ? "bg-[#C62835] hover:bg-[#A8202C]" : "bg-brand hover:bg-brand-hover"
            }`}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {ACTION_LABEL[action]}
          </button>
        </div>
      </form>
    </AdminDialog>
  );
}
