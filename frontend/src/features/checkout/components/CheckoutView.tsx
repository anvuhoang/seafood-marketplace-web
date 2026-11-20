"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ChevronRight, Loader2, ShoppingCart } from "lucide-react";
import { listAddresses } from "@/features/account/api/account.api";
import { ApiError } from "@/features/auth/api/auth.api";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useCart } from "@/features/cart/context/CartContext";
import { placeOrder, previewCheckout } from "../api/checkout.api";
import { useIdempotencyKey } from "../hooks/useIdempotencyKey";
import type { CheckoutPreview, PaymentMethod, PlaceOrderInput } from "../types/checkout.types";
import { emptyShippingForm, hasErrors, toShippingInput, validateNote, validateShipping, type ShippingErrors, type ShippingFormValues } from "../utils/shipping-form";
import type { Address } from "@/features/account/types/account.types";
import { CheckoutSteps } from "./CheckoutSteps";
import { CheckoutSummary } from "./CheckoutSummary";
import { PaymentSection } from "./PaymentSection";
import { NEW_ADDRESS, ShippingSection } from "./ShippingSection";
import { VendorReview } from "./VendorReview";

const FIX_FIELDS = "Vui lòng kiểm tra lại các trường được đánh dấu.";

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; preview: CheckoutPreview; addresses: Address[] };

/**
 * Checkout: where to send, the goods of each vendor, how to pay. The goods and every amount come from the
 * server's preview; this page only collects the shipping information and sends the order with an
 * idempotency key, so pressing the button twice cannot place two orders.
 */
export function CheckoutView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken, user } = useAuth();
  const { refresh: refreshCart } = useCart();

  // The lines ticked in the cart come as ?items=offerId,offerId; without it the whole cart is bought.
  const itemsParam = searchParams.get("items") ?? "";
  const items = useMemo(() => (itemsParam ? itemsParam.split(",").filter(Boolean) : undefined), [itemsParam]);

  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [reloads, setReloads] = useState(0);
  const [chosenAddress, setChosenAddress] = useState<string | null>(null);
  const [form, setForm] = useState<ShippingFormValues>(() => emptyShippingForm(user?.fullName ?? "", user?.phone ?? ""));
  const [note, setNote] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("COD");
  const [errors, setErrors] = useState<ShippingErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let current = true;
    Promise.all([previewCheckout(accessToken, items), listAddresses(accessToken).catch(() => [] as Address[])])
      .then(([preview, addresses]) => current && setState({ kind: "ready", preview, addresses }))
      .catch((error: unknown) => {
        if (!current) return;
        setState({ kind: "error", message: error instanceof ApiError ? error.message : "Không tải được thông tin đặt hàng. Vui lòng thử lại." });
      });
    return () => {
      current = false;
    };
  }, [accessToken, items, reloads]);

  const addresses = state.kind === "ready" ? state.addresses : [];
  const fallback = (addresses.find((address) => address.isDefault) ?? addresses[0])?.id ?? NEW_ADDRESS;
  const selectedAddress = chosenAddress && (chosenAddress === NEW_ADDRESS || addresses.some((address) => address.id === chosenAddress)) ? chosenAddress : fallback;
  const typing = selectedAddress === NEW_ADDRESS;

  // What would be sent. The idempotency key follows its content: the same order keeps its key, a changed one gets a new key.
  const body = useMemo<PlaceOrderInput>(
    () => ({
      ...(items && { items }),
      ...(typing ? { shipping: toShippingInput(form) } : { addressId: selectedAddress }),
      paymentMethod: payment,
      ...(note.trim() && { customerNote: note.trim() }),
    }),
    [items, typing, form, selectedAddress, payment, note],
  );
  const keyFor = useIdempotencyKey(body);

  /** A field that is being corrected no longer shows its old error. */
  function clearErrorsFor(fields: string[]) {
    const next = { ...errors };
    for (const field of fields) {
      delete next[field as keyof ShippingErrors];
      if (field === "provinceCode") delete next.province;
      if (field === "districtCode") delete next.district;
    }
    setErrors(next);
    // Once nothing is flagged any more, the general reminder goes too.
    if (Object.keys(next).length === 0) setSubmitError((message) => (message === FIX_FIELDS ? null : message));
  }

  async function confirm() {
    if (!accessToken || state.kind !== "ready" || submitting) return;
    setSubmitError(null);

    const found = typing ? validateShipping(form, note) : validateNote(note);
    setErrors(found);
    if (hasErrors(found)) {
      setSubmitError(FIX_FIELDS);
      return;
    }

    setSubmitting(true);
    try {
      const result = await placeOrder(accessToken, keyFor(), body);
      // The bought lines have left the cart on the server; make the header and the cart page say so.
      refreshCart();
      router.push(`/customer/checkout/success?order=${encodeURIComponent(result.order.orderNumber)}`);
    } catch (error) {
      setSubmitError(error instanceof ApiError ? error.message : "Không thể kết nối tới máy chủ. Vui lòng thử lại.");
      // A refused order (stock changed, a line withdrawn...) leaves things as they were: show the new situation.
      if (error instanceof ApiError && error.statusCode === 409) setReloads((count) => count + 1);
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <nav aria-label="Đường dẫn" className="flex items-center gap-1 text-xs text-slate-500">
        <Link href="/" className="hover:underline">
          Trang chủ
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <Link href="/customer/cart" className="hover:underline">
          Giỏ hàng
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <span className="font-semibold text-slate-800">Đặt hàng & thanh toán</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Đặt hàng & Thanh toán</h1>
          <p className="text-xs text-slate-500">Vui lòng điền thông tin và xác nhận để vựa chuẩn bị hải sản cho bạn.</p>
        </div>
        <CheckoutSteps current={1} />
      </div>

      {state.kind === "loading" && (
        <p role="status" className="flex min-h-48 items-center justify-center gap-2 rounded-3xl border border-slate-200 bg-white text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden />
          Đang chuẩn bị đơn hàng...
        </p>
      )}

      {state.kind === "error" && (
        <div role="alert" className="space-y-3 rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center">
          <p className="text-sm text-rose-900">{state.message}</p>
          <Link href="/customer/cart" className="inline-flex items-center gap-2 rounded-xl bg-[#0F3860] px-4 py-2 text-xs font-bold text-white hover:bg-[#0A2744]">
            <ShoppingCart className="h-4 w-4" aria-hidden />
            Quay lại giỏ hàng
          </Link>
        </div>
      )}

      {state.kind === "ready" && state.preview.lineCount === 0 && (
        <div className="space-y-4 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <ShoppingCart className="mx-auto h-12 w-12 text-slate-300" aria-hidden />
          <h2 className="text-base font-bold text-slate-800">Không có sản phẩm nào để đặt</h2>
          <Link href="/products" className="inline-flex items-center gap-2 rounded-xl bg-[#0F3860] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#0A2744]">
            <span>Tiếp tục khám phá hải sản</span>
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      )}

      {state.kind === "ready" && state.preview.lineCount > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-8">
            <ShippingSection
              addresses={addresses}
              selected={selectedAddress}
              onSelect={(id) => {
                setChosenAddress(id);
                setErrors({});
              }}
              form={form}
              onFormChange={(patch) => {
                setForm((current) => ({ ...current, ...patch }));
                clearErrorsFor(Object.keys(patch));
              }}
              note={note}
              onNoteChange={(value) => {
                setNote(value);
                clearErrorsFor(["customerNote"]);
              }}
              errors={errors}
              disabled={submitting}
            />
            <VendorReview vendors={state.preview.vendors} />
            <PaymentSection supported={state.preview.supportedPaymentMethods} selected={payment} onSelect={setPayment} disabled={submitting} />
          </div>
          <div className="lg:col-span-4">
            <CheckoutSummary preview={state.preview} submitting={submitting} error={submitError} onConfirm={confirm} />
          </div>
        </div>
      )}
    </div>
  );
}
