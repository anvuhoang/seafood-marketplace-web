"use client";

import { useId } from "react";
import { fieldClass } from "./VendorDialog";
import { formatQuantity, formatVnd, validatePrice, validateStock } from "../utils/vendor-product-form";

interface OfferAmountFieldProps {
  kind: "price" | "stock";
  value: string;
  error?: string;
  /** Unit of the variant, shown after the stock. */
  unit?: string;
  label?: string;
  compact?: boolean;
  required?: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
}

/**
 * Price or stock input. Typed as text so Vietnamese users are not tripped by
 * locale number inputs; the value is checked like the API checks it, and a
 * formatted preview shows how the number was read.
 */
export function OfferAmountField({ kind, value, error, unit, label, compact, required = true, disabled, onChange }: OfferAmountFieldProps) {
  const id = useId();
  const parsed = kind === "price" ? validatePrice(value) : validateStock(value);
  const preview =
    value.trim() && parsed.value !== undefined
      ? kind === "price"
        ? formatVnd(parsed.value)
        : `${formatQuantity(parsed.value)}${unit ? ` ${unit}` : ""}`
      : null;
  const hint =
    kind === "price" ? "Đơn vị: đồng. Không dùng dấu chấm phân cách hàng nghìn." : `Số lượng trong kho${unit ? ` (${unit})` : ""}, có thể lẻ tới 3 chữ số.`;

  return (
    <div className="min-w-0">
      <label htmlFor={id} className={compact ? "text-xs font-semibold text-slate-700" : "text-sm font-semibold text-slate-800"}>
        {label ?? (kind === "price" ? "Giá bán (đ)" : "Tồn kho")}
        {required && <span className="text-rose-600"> *</span>}
      </label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        disabled={disabled}
        placeholder={kind === "price" ? "450000" : "10"}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
        className={fieldClass(Boolean(error), "mt-1 tabular-nums")}
      />
      <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">
        {preview ? <span className="font-semibold text-slate-700">= {preview}</span> : !compact && hint}
      </p>
      {error && (
        <p id={`${id}-error`} className="mt-0.5 text-xs text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}
