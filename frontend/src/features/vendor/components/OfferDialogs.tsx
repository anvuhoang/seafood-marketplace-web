"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { ApiError } from "@/features/auth/api/auth.api";
import { changeOfferStatus, updateOffer } from "../api/vendor-product.api";
import type { VendorOffer } from "../types/vendor-product.types";
import { amountToInput, mapOfferMessages, validatePrice, validateStock } from "../utils/vendor-product-form";
import type { OfferFormErrors } from "../utils/vendor-product-form";
import { OfferAmountField } from "./OfferAmountField";
import { VendorDialog, dialogButton } from "./VendorDialog";

function offerLabel(offer: VendorOffer) {
  return `${offer.product.name} · ${offer.variant.name}${offer.variant.sizeLabel ? ` (${offer.variant.sizeLabel})` : ""}`;
}

interface OfferDialogProps {
  token: string;
  offer: VendorOffer;
  onClose: () => void;
  onSaved: (offer: VendorOffer) => void;
}

/** Change the price and stock of one offer. Only changed values are sent. */
export function EditOfferDialog({ token, offer, onClose, onSaved }: OfferDialogProps) {
  const [price, setPrice] = useState(amountToInput(offer.price));
  const [stock, setStock] = useState(amountToInput(offer.stock));
  const [errors, setErrors] = useState<OfferFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsedPrice = validatePrice(price);
    const parsedStock = validateStock(stock);
    const nextErrors: OfferFormErrors = { price: parsedPrice.error, stock: parsedStock.error };
    setErrors(nextErrors);
    setFormError(null);
    if (parsedPrice.error || parsedStock.error) return;

    const changes: { price?: number; stock?: number } = {};
    if (parsedPrice.value !== Number(offer.price)) changes.price = parsedPrice.value;
    if (parsedStock.value !== Number(offer.stock)) changes.stock = parsedStock.value;
    if (Object.keys(changes).length === 0) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      onSaved(await updateOffer(token, offer.id, changes));
    } catch (error) {
      if (error instanceof ApiError) {
        const { fields, other } = mapOfferMessages(error.messages);
        setErrors(fields);
        setFormError(other.join(" ") || (Object.keys(fields).length ? null : error.message));
      } else {
        setFormError("Không thể lưu thay đổi. Vui lòng thử lại.");
      }
      setSaving(false);
    }
  }

  return (
    <VendorDialog
      title="Sửa giá và tồn kho"
      description={offerLabel(offer)}
      busy={saving}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={saving} className={dialogButton.secondary}>
            Hủy
          </button>
          <button type="submit" form="edit-offer-form" disabled={saving} className={dialogButton.primary}>
            {saving && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </>
      }
    >
      <form id="edit-offer-form" noValidate onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <OfferAmountField kind="price" value={price} error={errors.price} disabled={saving} onChange={setPrice} />
        <OfferAmountField
          kind="stock"
          value={stock}
          unit={offer.variant.unit}
          error={errors.stock}
          disabled={saving}
          onChange={setStock}
        />
        {formError && (
          <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 sm:col-span-2">
            {formError}
          </p>
        )}
      </form>
    </VendorDialog>
  );
}

/** Confirms the final "stop selling" step; it cannot be undone. */
export function DiscontinueOfferDialog({ token, offer, onClose, onSaved }: OfferDialogProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setSaving(true);
    setError(null);
    try {
      onSaved(await changeOfferStatus(token, offer.id, "DISCONTINUED"));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể ngừng bán. Vui lòng thử lại.");
      setSaving(false);
    }
  }

  return (
    <VendorDialog
      title="Ngừng bán sản phẩm này?"
      description={offerLabel(offer)}
      tone="danger"
      busy={saving}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={saving} className={dialogButton.secondary} data-autofocus>
            Giữ lại
          </button>
          <button type="button" onClick={confirm} disabled={saving} className={dialogButton.danger}>
            {saving && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
            {saving ? "Đang ngừng bán..." : "Ngừng bán vĩnh viễn"}
          </button>
        </>
      }
    >
      <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
        <li>
          <span className="font-semibold text-slate-900">Không thể hoàn tác.</span> Sản phẩm sẽ không thể mở bán lại,
          cũng không thể thêm lại cùng biến thể này vào gian hàng.
        </li>
        <li>Khách hàng sẽ không còn thấy và không thể mua sản phẩm này từ gian hàng của bạn.</li>
        <li>Các đơn hàng đã đặt trước đó không bị ảnh hưởng và vẫn xử lý bình thường.</li>
        <li>Nếu chỉ muốn tạm dừng, hãy chọn &quot;Tạm ngưng&quot; để có thể mở bán lại sau.</li>
      </ul>
      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </p>
      )}
    </VendorDialog>
  );
}
