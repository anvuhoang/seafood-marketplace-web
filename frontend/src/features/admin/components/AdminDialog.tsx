"use client";

import { ReactNode, useEffect, useRef } from "react";
import { X } from "lucide-react";

interface AdminDialogProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** "md" for confirmations, "lg" for detail panels. */
  size?: "md" | "lg";
}

/**
 * Modal built on the native <dialog>, which gives focus trapping, Escape to
 * close and a backdrop without extra code.
 */
export function AdminDialog({ title, onClose, children, size = "md" }: AdminDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        // A click on the backdrop lands on the dialog element itself.
        if (event.target === ref.current) onClose();
      }}
      className={`m-auto max-h-[90vh] w-[calc(100%-2rem)] overflow-hidden rounded-2xl border-0 bg-white p-0 shadow-xl text-slate-800 backdrop:bg-black/50 ${
        size === "lg" ? "max-w-2xl" : "max-w-md"
      }`}
    >
      <div className="flex max-h-[90vh] flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </dialog>
  );
}
