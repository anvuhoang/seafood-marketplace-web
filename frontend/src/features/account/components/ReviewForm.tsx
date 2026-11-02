"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Check, ImagePlus, Loader2, SendHorizontal, Star, X } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { FALLBACK_PRODUCT_IMAGE } from "@/lib/constants/images";
import { createReview, uploadReviewImage } from "../api/review.api";
import {
  PendingReviewItem,
  RATING_TEXT,
  REVIEW_CONTENT_MAX_LENGTH,
  REVIEW_CONTENT_MIN_LENGTH,
  REVIEW_HIGHLIGHTS,
  REVIEW_MAX_IMAGES,
  ReviewHighlight,
} from "../types/review.types";

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

interface PendingOrderCardProps {
  orderNumber: string;
  vendorName: string;
  deliveredAt: string;
  items: PendingReviewItem[];
  token: string;
  anonymousName: string;
  imageUploadEnabled: boolean;
  expandedId: string | null;
  onExpand: (orderItemId: string) => void;
  onLater: () => void;
  onSubmitted: (item: PendingReviewItem) => void;
}

/** One delivered order: its items, each with an inline review form. */
export function PendingOrderCard({
  orderNumber,
  vendorName,
  deliveredAt,
  items,
  token,
  anonymousName,
  imageUploadEnabled,
  expandedId,
  onExpand,
  onLater,
  onSubmitted,
}: PendingOrderCardProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-slate-100 px-5 py-3.5">
        <p className="text-sm text-slate-500">
          <span className="font-bold text-slate-900">Đơn #{orderNumber}</span>
          <span className="mx-2 text-slate-300">/</span>
          {vendorName}
        </p>
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Giao thành công {formatDate(deliveredAt)}
        </p>
      </header>

      <ul className="divide-y divide-slate-100">
        {items.map((item) => {
          const expanded = expandedId === item.orderItemId;
          return (
            <li key={item.orderItemId} className="px-5 py-4">
              <div className="flex items-center gap-4">
                <Link href={`/products/${item.product.id}`} className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.product.imageUrl ?? FALLBACK_PRODUCT_IMAGE}
                    alt={item.product.name}
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/products/${item.product.id}`}
                    className="line-clamp-2 font-semibold text-slate-900 hover:text-[#0F3860]"
                  >
                    {item.product.name}
                  </Link>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {item.variantName} · {item.quantity} {item.unit} ·{" "}
                    <span className="font-semibold text-slate-700">{formatPrice(item.lineTotal)}</span>
                  </p>
                </div>
                {!expanded && (
                  <button
                    type="button"
                    onClick={() => onExpand(item.orderItemId)}
                    className="shrink-0 rounded-lg border border-[#0F3860] px-4 py-2 text-sm font-semibold text-[#0F3860] transition hover:bg-[#0F3860] hover:text-white"
                  >
                    Viết đánh giá
                  </button>
                )}
              </div>

              {expanded && (
                <ReviewFormFields
                  item={item}
                  token={token}
                  anonymousName={anonymousName}
                  imageUploadEnabled={imageUploadEnabled}
                  onLater={onLater}
                  onSubmitted={() => onSubmitted(item)}
                />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function FieldLabel({ step, children, required }: { step: number; children: React.ReactNode; required?: boolean }) {
  return (
    <span className="text-sm font-semibold text-slate-900">
      <span className="mr-1.5 text-slate-400">{step}.</span>
      {children}
      {required && <span className="ml-0.5 text-[#E63946]">*</span>}
    </span>
  );
}

function ReviewFormFields({
  item,
  token,
  anonymousName,
  imageUploadEnabled,
  onLater,
  onSubmitted,
}: {
  item: PendingReviewItem;
  token: string;
  anonymousName: string;
  imageUploadEnabled: boolean;
  onLater: () => void;
  onSubmitted: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [highlights, setHighlights] = useState<ReviewHighlight[]>([]);
  const [content, setContent] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(0);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const shownRating = hoverRating || rating;
  const slotsLeft = REVIEW_MAX_IMAGES - imageUrls.length - uploading;
  const contentId = `content-${item.orderItemId}`;

  const toggleHighlight = (key: ReviewHighlight) =>
    setHighlights((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]));

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const selected = Array.from(files).slice(0, Math.max(0, slotsLeft));
    setError(null);
    setUploading((n) => n + selected.length);

    // Upload in parallel; keep whatever succeeded and report the first failure.
    const results = await Promise.allSettled(selected.map((file) => uploadReviewImage(token, file)));
    const uploaded = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    const failure = results.find((r): r is PromiseRejectedResult => r.status === "rejected");

    setImageUrls((current) => [...current, ...uploaded].slice(0, REVIEW_MAX_IMAGES));
    setUploading((n) => n - selected.length);
    if (failure) {
      setError(failure.reason instanceof Error ? failure.reason.message : "Tải ảnh lên không thành công.");
    }
  };

  const validate = (): string | null => {
    if (rating === 0) return "Vui lòng chọn số sao đánh giá.";
    if (content.trim().length < REVIEW_CONTENT_MIN_LENGTH)
      return `Vui lòng chia sẻ ít nhất ${REVIEW_CONTENT_MIN_LENGTH} ký tự về trải nghiệm của bạn.`;
    if (uploading > 0) return "Vui lòng đợi ảnh tải lên xong.";
    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createReview(token, {
        orderItemId: item.orderItemId,
        rating,
        content: content.trim(),
        highlights,
        isAnonymous,
        imageUrls,
      });
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gửi đánh giá không thành công.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-6 border-t border-dashed border-slate-200 pt-5">
      <fieldset>
        <legend>
          <FieldLabel step={1} required>
            Mức độ hài lòng
          </FieldLabel>
        </legend>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <div className="flex" onMouseLeave={() => setHoverRating(0)}>
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                onMouseEnter={() => setHoverRating(value)}
                aria-label={`${value} sao`}
                aria-pressed={rating === value}
                className="p-0.5"
              >
                <Star
                  className={`h-7 w-7 transition-colors ${
                    value <= shownRating ? "fill-amber-400 text-amber-400" : "fill-slate-100 text-slate-300"
                  }`}
                />
              </button>
            ))}
          </div>
          <span className={`text-sm ${shownRating > 0 ? "font-medium text-amber-700" : "text-slate-400"}`}>
            {shownRating > 0 ? RATING_TEXT[shownRating] : "Chạm để chọn số sao"}
          </span>
        </div>
      </fieldset>

      <fieldset>
        <legend>
          <FieldLabel step={2}>Điểm nổi bật</FieldLabel>
          <span className="ml-2 text-xs text-slate-400">Chọn nhanh, không bắt buộc</span>
        </legend>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {REVIEW_HIGHLIGHTS.map(({ key, label }) => {
            const selected = highlights.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleHighlight(key)}
                aria-pressed={selected}
                className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition ${
                  selected
                    ? "border-[#0F3860] bg-[#0F3860] text-white"
                    : "border-slate-200 text-slate-700 hover:border-slate-400"
                }`}
              >
                {selected && <Check className="h-3.5 w-3.5" />}
                {label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div>
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={contentId}>
            <FieldLabel step={3} required>
              Chia sẻ trải nghiệm
            </FieldLabel>
          </label>
          <span className="text-xs tabular-nums text-slate-400">
            {content.length}/{REVIEW_CONTENT_MAX_LENGTH}
          </span>
        </div>
        <textarea
          id={contentId}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={REVIEW_CONTENT_MAX_LENGTH}
          rows={4}
          placeholder="Hải sản khi nhận còn tươi không? Đóng gói, giao hàng và hương vị thế nào?"
          className="mt-2 w-full resize-y rounded-lg border border-slate-200 px-3.5 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#0F3860] focus:ring-2 focus:ring-[#0F3860]/10"
        />
      </div>

      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <FieldLabel step={4}>Hình ảnh thực tế</FieldLabel>
          <span className="text-xs text-slate-400">
            Tối đa {REVIEW_MAX_IMAGES} ảnh · +200 xu khi có ảnh mở thùng
          </span>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-2.5">
          {imageUrls.map((url, index) => (
            <div key={url} className="group relative h-20 w-20 overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Ảnh ${index + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setImageUrls((current) => current.filter((u) => u !== url))}
                aria-label={`Xóa ảnh ${index + 1}`}
                className="absolute top-1 right-1 rounded-full bg-slate-900/70 p-0.5 text-white hover:bg-[#E63946]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {Array.from({ length: uploading }, (_, index) => (
            <div
              key={`uploading-${index}`}
              className="flex h-20 w-20 items-center justify-center rounded-lg border border-slate-200 text-slate-400"
            >
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ))}
          {slotsLeft > 0 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!imageUploadEnabled}
              className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 text-xs text-slate-500 transition hover:border-[#0F3860] hover:text-[#0F3860] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-300 disabled:hover:text-slate-500"
            >
              <ImagePlus className="h-5 w-5" />
              Thêm ảnh
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              void handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
        {!imageUploadEnabled && (
          <p className="mt-2 text-xs text-slate-400">Tải ảnh đang tạm khóa, bạn vẫn gửi được đánh giá.</p>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-[#C62835]">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 accent-[#0F3860]"
          />
          Ẩn danh, hiển thị là <span className="font-semibold text-slate-800">{anonymousName}</span>
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onLater}
            disabled={submitting}
            className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            Để sau
          </button>
          <button
            type="submit"
            disabled={submitting || uploading > 0}
            className="flex items-center gap-2 rounded-lg bg-[#E63946] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#D62839] disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
            Gửi đánh giá
          </button>
        </div>
      </div>
    </form>
  );
}

/** Groups pending items by order, keeping the newest delivery first. */
export function groupByOrder(items: PendingReviewItem[]) {
  const groups = new Map<string, PendingReviewItem[]>();
  for (const item of items) {
    groups.set(item.orderNumber, [...(groups.get(item.orderNumber) ?? []), item]);
  }
  return [...groups.values()];
}
