"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ExternalLink, Fish, Loader2, LogIn, PackageCheck, ShoppingCart } from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { useCart } from "@/features/cart/context/CartContext";
import { reorderMyOrder } from "@/features/order/api/customer-order.api";
import { ORDER_STATUS } from "@/features/order/constants/order-status";
import type { OrderStatus } from "@/features/order/types/order.types";
import { formatDateTime, formatVnd } from "@/features/order/utils/order-format";
import { cn, formatPrice } from "@/lib/utils";
import type { ChatCard } from "../types/chat.types";

type Card<T extends ChatCard["type"]> = Extract<ChatCard, { type: T }>;

const cardClass = "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs";

function Thumb({ src, alt }: { src: string | null; alt: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className="h-14 w-14 shrink-0 rounded-lg object-cover" loading="lazy" />
  ) : (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
      <Fish className="h-6 w-6" aria-hidden="true" />
    </span>
  );
}

/** What pressing "add" did, said in a line under the button. */
function Result({ result }: { result: { ok: boolean; text: string } | null }) {
  if (!result) return null;
  return (
    <p role="status" className={cn("mt-1.5 flex items-center gap-1 text-xs font-semibold", result.ok ? "text-emerald-700" : "text-rose-700")}>
      {result.ok && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
      {result.text}
      {result.ok && (
        <Link href="/customer/cart" className="ml-1 underline">
          Xem giỏ hàng
        </Link>
      )}
    </p>
  );
}

/** A product the assistant found. Everything on it (price, stock) was read from the shop, not written by the model. */
function ProductCard({ card }: { card: Card<"product"> }) {
  const { addToCart } = useCart();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function add() {
    setBusy(true);
    const outcome = await addToCart({ offerId: card.offerId, quantity: 1 });
    setResult({ ok: outcome.success, text: outcome.message });
    setBusy(false);
  }

  return (
    <div className={cn(cardClass, "p-2.5")}>
      <div className="flex gap-2.5">
        <Thumb src={card.imageUrl} alt={card.name} />
        <div className="min-w-0 flex-1">
          <Link href={`/products/${card.slug}`} className="line-clamp-2 text-xs font-bold text-slate-900 hover:underline">
            {card.name}
          </Link>
          <p className="mt-0.5 text-sm font-bold text-[#E63946]">
            {formatPrice(card.price)}
            <span className="text-xs font-semibold text-slate-500">/{card.unit}</span>
          </p>
          <p className="truncate text-[11px] text-slate-500">{card.vendor}</p>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className={cn("text-[11px] font-semibold", card.inStock ? "text-emerald-700" : "text-rose-700")}>
          {card.inStock ? `Còn ${card.stock} ${card.unit}` : "Hết hàng"}
        </span>
        <button
          type="button"
          onClick={add}
          disabled={busy || !card.inStock}
          className="inline-flex items-center gap-1 rounded-lg bg-[#0F3860] px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-[#0A2744] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />}
          Thêm vào giỏ
        </button>
      </div>
      <Result result={result} />
    </div>
  );
}

/** A proposal to add something to the cart. The cart only changes when the customer presses the button. */
function CartProposalCard({ card }: { card: Card<"cart_proposal"> }) {
  const { addToCart } = useCart();
  const [state, setState] = useState<"idle" | "busy" | "done" | "skipped">("idle");
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function confirm() {
    setState("busy");
    const outcome = await addToCart({ offerId: card.offerId, quantity: card.quantity });
    setResult({ ok: outcome.success, text: outcome.message });
    setState(outcome.success ? "done" : "idle");
  }

  if (state === "skipped") return <p className="text-xs text-slate-500">Đã bỏ qua đề xuất thêm {card.productName}.</p>;

  return (
    <div className={cn(cardClass, "border-[#0F3860]/30 p-2.5")}>
      <p className="mb-2 text-[11px] font-bold tracking-wide text-[#0F3860] uppercase">Xác nhận thêm vào giỏ</p>
      <div className="flex gap-2.5">
        <Thumb src={card.imageUrl} alt={card.productName} />
        <div className="min-w-0 flex-1">
          <Link href={`/products/${card.slug}`} className="line-clamp-2 text-xs font-bold text-slate-900 hover:underline">
            {card.productName}
          </Link>
          <p className="truncate text-[11px] text-slate-500">{card.vendor}</p>
          <p className="mt-0.5 text-xs text-slate-700">
            {card.quantity} {card.unit} × {formatPrice(card.unitPrice)} ={" "}
            <strong className="text-[#E63946]">{formatPrice(Math.round(card.quantity * card.unitPrice))}</strong>
          </p>
        </div>
      </div>
      {state !== "done" && (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={confirm}
            disabled={state === "busy"}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#E63946] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#C62835] disabled:opacity-60"
          >
            {state === "busy" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />}
            Thêm vào giỏ
          </button>
          <button type="button" onClick={() => setState("skipped")} disabled={state === "busy"} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            Bỏ qua
          </button>
        </div>
      )}
      <Result result={result} />
    </div>
  );
}

/** An order of the signed-in customer. */
function OrderCard({ card }: { card: Card<"order"> }) {
  const style = ORDER_STATUS[card.status as OrderStatus];
  return (
    <div className={cn(cardClass, "p-2.5")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-slate-900">#{card.orderNumber}</p>
          <p className="text-[11px] text-slate-500">{formatDateTime(card.createdAt)}</p>
        </div>
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1", style?.className ?? "bg-slate-100 text-slate-700 ring-slate-300")}>{card.statusLabel}</span>
      </div>
      {card.items.length > 0 && <p className="mt-1.5 line-clamp-2 text-[11px] text-slate-600">{card.items.join(" · ")}</p>}
      {card.paymentLabel && <p className="mt-1 text-[11px] text-slate-500">{card.paymentLabel}</p>}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm font-bold text-[#E63946]">{formatVnd(card.grandTotal)}</span>
        <Link href={`/customer/orders/${encodeURIComponent(card.orderNumber)}`} className="inline-flex items-center gap-1 text-xs font-bold text-[#0F3860] hover:underline">
          Xem chi tiết
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

/** "Buy this order again", confirmed by the customer. */
function ReorderCard({ card }: { card: Card<"reorder"> }) {
  const { accessToken } = useAuth();
  const { refresh } = useCart();
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function confirm() {
    if (!accessToken) return;
    setState("busy");
    try {
      const outcome = await reorderMyOrder(accessToken, card.orderNumber);
      refresh();
      const skipped = outcome.skipped > 0 ? ` (${outcome.skipped} sản phẩm không thể thêm)` : "";
      setResult({ ok: outcome.added > 0, text: outcome.added > 0 ? `Đã thêm ${outcome.added} sản phẩm vào giỏ${skipped}.` : "Không thêm được sản phẩm nào vào giỏ." });
      setState(outcome.added > 0 ? "done" : "idle");
    } catch {
      setResult({ ok: false, text: "Không thể mua lại đơn này. Bạn thử lại nhé." });
      setState("idle");
    }
  }

  return (
    <div className={cn(cardClass, "border-[#0F3860]/30 p-2.5")}>
      <p className="mb-1.5 flex items-center gap-1 text-[11px] font-bold tracking-wide text-[#0F3860] uppercase">
        <PackageCheck className="h-3.5 w-3.5" aria-hidden="true" />
        Mua lại đơn #{card.orderNumber}
      </p>
      <p className="line-clamp-3 text-[11px] text-slate-600">{card.items.join(" · ")}</p>
      {state !== "done" && (
        <button
          type="button"
          onClick={confirm}
          disabled={state === "busy"}
          className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-[#E63946] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#C62835] disabled:opacity-60"
        >
          {state === "busy" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />}
          Thêm cả đơn vào giỏ
        </button>
      )}
      <Result result={result} />
    </div>
  );
}

function LoginCard() {
  const pathname = usePathname();
  return (
    <div className={cn(cardClass, "flex items-center justify-between gap-2 p-2.5")}>
      <p className="text-xs text-slate-700">Bạn cần đăng nhập để dùng chức năng này.</p>
      <Link
        href={`/customer/login?redirect=${encodeURIComponent(pathname || "/")}`}
        className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#0F3860] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#0A2744]"
      >
        <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
        Đăng nhập
      </Link>
    </div>
  );
}

/**
 * Renders the cards under an answer. The "handoff" card is drawn by the panel (it needs the conversation), so it
 * is passed in as `renderHandoff`.
 */
export function ChatCards({ cards, renderHandoff }: { cards: ChatCard[]; renderHandoff: (card: Card<"handoff">) => React.ReactNode }) {
  // Several searches in one answer can find the same product twice; show it once.
  const seen = new Set<string>();
  const unique = cards.filter((card) => {
    const key = card.type === "product" ? `p:${card.offerId}` : card.type === "order" ? `o:${card.orderNumber}` : card.type === "login_required" ? "login" : null;
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (
    <div className="mt-2 space-y-2">
      {unique.map((card, index) => {
        switch (card.type) {
          case "product":
            return <ProductCard key={`${card.offerId}-${index}`} card={card} />;
          case "cart_proposal":
            return <CartProposalCard key={`${card.offerId}-${index}`} card={card} />;
          case "order":
            return <OrderCard key={`${card.orderNumber}-${index}`} card={card} />;
          case "reorder":
            return <ReorderCard key={`${card.orderNumber}-${index}`} card={card} />;
          case "login_required":
            return <LoginCard key={`login-${index}`} />;
          case "handoff":
            return <div key={`handoff-${index}`}>{renderHandoff(card)}</div>;
        }
      })}
    </div>
  );
}
