"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { AdminDialog } from "./AdminDialog";

interface CategoryConfirmDialogProps {
  title: string;
  categoryName: string;
  message: string;
  confirmLabel: string;
  /** Red button for hiding or deleting; the brand colour otherwise. */
  destructive?: boolean;
  onCancel: () => void;
  /** Resolves once done; rejects with a readable message otherwise. */
  onConfirm: () => Promise<void>;
}

/** The "are you sure" step for hiding, showing and deleting a category. */
export function CategoryConfirmDialog({
  title,
  categoryName,
  message,
  confirmLabel,
  destructive = false,
  onCancel,
  onConfirm,
}: CategoryConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể thực hiện. Vui lòng thử lại.");
      setBusy(false);
    }
  };

  return (
    <AdminDialog title={title} onClose={busy ? () => undefined : onCancel}>
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-slate-700">
          <span className="font-semibold text-slate-900">{categoryName}</span>
          <br />
          {message}
        </p>

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
            type="button"
            onClick={confirm}
            disabled={busy}
            className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-[#fff] transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              destructive ? "bg-[#C62835] hover:bg-[#A8202C]" : "bg-brand hover:bg-brand-hover"
            }`}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </AdminDialog>
  );
}
