"use client";

import { useEffect } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

export interface CartToastMessage {
  message: string;
  /** success: it worked; error: the API refused; info: it worked, with something the customer should know. */
  kind: "success" | "error" | "info";
}

const ICONS = {
  success: <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden />,
  error: <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" aria-hidden />,
  info: <Info className="h-5 w-5 shrink-0 text-amber-400" aria-hidden />,
};

/** The result of the last cart action, on any page. Errors stay a little longer so they can be read. */
export function CartToast({ toast, onClose }: { toast: CartToastMessage | null; onClose: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onClose, toast.kind === "success" ? 4000 : 8000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div
      role={toast.kind === "error" ? "alert" : "status"}
      className="animate-slide-up fixed top-20 right-4 z-50 flex max-w-sm items-start gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white shadow-xl"
    >
      {ICONS[toast.kind]}
      <p className="pr-2 text-xs font-medium">{toast.message}</p>
      <button type="button" onClick={onClose} aria-label="Đóng thông báo" className="rounded-lg p-1 text-slate-400 hover:text-white">
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
