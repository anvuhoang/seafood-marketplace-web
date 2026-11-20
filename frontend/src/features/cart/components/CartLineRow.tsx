"use client";

import Link from "next/link";
import { AlertCircle, Minus, Plus, Trash2 } from "lucide-react";
import { FALLBACK_PRODUCT_IMAGE } from "@/lib/constants/images";
import { formatPrice } from "@/lib/utils";
import type { CartActionResult, CartItemView } from "../types/cart.types";

const QUANTITY = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 });
const formatQuantity = (value: number) => QUANTITY.format(value);

/** Plus and minus move by one unit, but never to zero or past the stock. */
const STEP = 1;

interface CartLineRowProps {
  item: CartItemView;
  /** A change is being sent: the controls wait instead of racing it. */
  busy: boolean;
  onQuantityChange: (item: CartItemView, quantity: number) => Promise<CartActionResult>;
  onRemove: (item: CartItemView) => Promise<CartActionResult>;
}

/** One line of the cart. Prices and the line total come from the server; this only shows them. */
export function CartLineRow({ item, busy, onQuantityChange, onRemove }: CartLineRowProps) {
  const canDecrease = item.quantity - STEP > 0;
  const canIncrease = item.quantity < item.stock;
  const detail = [item.variantName, item.sizeLabel].filter(Boolean).join(" · ");

  const shown = formatQuantity(item.quantity).replace(/\./g, "");

  const commitTyped = async (input: HTMLInputElement) => {
    const typed = Number(input.value.replace(",", "."));
    const valid = Number.isFinite(typed) && typed > 0 && typed !== item.quantity;
    // Not a positive number, or refused by the server: the box goes back to what the cart holds.
    const accepted = valid ? (await onQuantityChange(item, typed)).success : false;
    if (!accepted) input.value = shown;
  };

  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex gap-4">
        <Link href={`/products/${item.productSlug}`} className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.imageUrl ?? FALLBACK_PRODUCT_IMAGE}
            alt={item.productName}
            className={`h-20 w-20 rounded-xl border border-slate-100 object-cover ${item.available ? "" : "opacity-50 grayscale"}`}
          />
        </Link>

        <div className="min-w-0 flex-1 space-y-1">
          <Link href={`/products/${item.productSlug}`} className="line-clamp-2 text-sm font-bold text-slate-900 hover:underline">
            {item.productName}
          </Link>
          {detail && <p className="text-xs text-slate-500">{detail}</p>}
          <p className="text-xs text-slate-400">
            Vựa:{" "}
            <Link href={`/vendor/${item.vendor.slug}`} className="hover:underline">
              {item.vendor.name}
            </Link>
          </p>
          <p className="text-xs text-slate-500">
            {formatPrice(item.unitPrice)} / {item.unit}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end justify-between gap-2 text-right">
          <div className={`text-sm font-bold ${item.available ? "text-[#E63946]" : "text-slate-400"}`}>
            {item.available ? formatPrice(item.subtotal) : "Chưa tính"}
          </div>
          <button
            type="button"
            onClick={() => onRemove(item)}
            disabled={busy}
            aria-label={`Xóa ${item.productName} khỏi giỏ hàng`}
            title="Xóa món"
            className="text-slate-400 transition hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-slate-300 bg-white p-0.5">
            <button
              type="button"
              disabled={busy || !canDecrease}
              onClick={() => onQuantityChange(item, Math.round((item.quantity - STEP) * 1000) / 1000)}
              aria-label="Giảm số lượng"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Minus className="h-4 w-4" aria-hidden />
            </button>
            {/* Uncontrolled, and re-created when the cart changes, so it always shows the server's quantity. */}
            <input
              key={`${item.offerId}-${item.quantity}`}
              type="text"
              inputMode="decimal"
              defaultValue={shown}
              disabled={busy}
              aria-label={`Số lượng (${item.unit})`}
              onBlur={(event) => void commitTyped(event.currentTarget)}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
              className="w-14 text-center text-sm font-bold text-slate-800 outline-none disabled:opacity-60"
            />
            <button
              type="button"
              disabled={busy || !canIncrease}
              onClick={() => onQuantityChange(item, Math.round(Math.min(item.stock, item.quantity + STEP) * 1000) / 1000)}
              aria-label="Tăng số lượng"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <Plus className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <span className="text-xs text-slate-500">{item.unit}</span>
        </div>

        <span className="text-[11px] text-slate-400">Còn {formatQuantity(item.stock)} {item.unit}</span>
      </div>

      {item.problem && (
        <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            {item.problem} Dòng này chưa được tính vào tổng tiền: hãy điều chỉnh số lượng hoặc xóa nó.
          </span>
        </p>
      )}
    </li>
  );
}
