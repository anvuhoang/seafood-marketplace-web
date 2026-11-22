"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { MapPin, Store } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { CartActionResult, CartItemView, CartVendorGroup as VendorGroup } from "../types/cart.types";
import { CartLineRow } from "./CartLineRow";

interface CartVendorGroupProps {
  group: VendorGroup;
  /** The lines of this vendor. */
  items: CartItemView[];
  /** Offer ids of the ticked lines (all vendors). */
  selectedOfferIds: ReadonlySet<string>;
  busy: boolean;
  onToggleVendor: (items: CartItemView[], checked: boolean) => void;
  onToggleLine: (item: CartItemView, checked: boolean) => void;
  onQuantityChange: (item: CartItemView, quantity: number) => Promise<CartActionResult>;
  onRemove: (item: CartItemView) => Promise<CartActionResult>;
}

/** The lines bought from one vendor, with the vendor's name and place, and the total the server worked out for them. */
export function CartVendorGroup({
  group,
  items,
  selectedOfferIds,
  busy,
  onToggleVendor,
  onToggleLine,
  onQuantityChange,
  onRemove,
}: CartVendorGroupProps) {
  const { vendor } = group;
  const buyable = items.filter((item) => item.available);
  const ticked = buyable.filter((item) => selectedOfferIds.has(item.offerId)).length;
  const all = buyable.length > 0 && ticked === buyable.length;

  // "Some but not all" is a state the checkbox only gets through its property.
  const box = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (box.current) box.current.indeterminate = ticked > 0 && !all;
  }, [ticked, all]);

  return (
    <section aria-label={`Vựa ${vendor.name}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <input
          ref={box}
          type="checkbox"
          checked={all}
          disabled={busy || buyable.length === 0}
          onChange={(event) => onToggleVendor(buyable, event.target.checked)}
          aria-label={`Chọn tất cả sản phẩm của ${vendor.name}`}
          className="h-4 w-4 shrink-0 cursor-pointer accent-[#0F3860] disabled:cursor-not-allowed"
        />
        <Store className="h-4 w-4 shrink-0 text-[#0F3860]" aria-hidden />
        <div className="min-w-0 flex-1">
          <Link href={`/vendor/${vendor.slug}`} className="block truncate text-sm font-bold text-slate-900 hover:underline">
            {vendor.name}
          </Link>
          <p className="flex items-center gap-1 text-[11px] text-slate-500">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">
              {vendor.district}, {vendor.province}
            </span>
          </p>
        </div>
        <Link href={`/vendor/${vendor.slug}`} className="shrink-0 text-xs font-semibold text-[#0F3860] hover:underline">
          Xem vựa
        </Link>
      </header>

      <ul>
        {items.map((item) => (
          <CartLineRow
            key={item.offerId}
            item={item}
            busy={busy}
            selected={selectedOfferIds.has(item.offerId)}
            onSelectChange={(checked) => onToggleLine(item, checked)}
            onQuantityChange={onQuantityChange}
            onRemove={onRemove}
          />
        ))}
      </ul>

      <footer className="flex items-baseline justify-between border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 text-xs text-slate-600">
        <span>Tạm tính vựa này ({group.lineCount} sản phẩm)</span>
        <span className="text-sm font-bold text-slate-900">{formatPrice(group.subtotal)}</span>
      </footer>
    </section>
  );
}
