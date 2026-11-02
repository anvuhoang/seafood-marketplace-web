"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Camera, CheckCircle2, Loader2, ShieldCheck, Star, Video } from "lucide-react";
import { AccountPageHeader, AccountShell } from "@/features/account/components/AccountShell";
import { PendingOrderCard, formatDate, groupByOrder } from "@/features/account/components/ReviewForm";
import { getReviewCenter } from "@/features/account/api/review.api";
import { REVIEW_HIGHLIGHTS, ReviewCenter, SubmittedReview } from "@/features/account/types/review.types";
import { useAuth } from "@/features/auth/context/AuthContext";
import { FALLBACK_PRODUCT_IMAGE } from "@/lib/constants/images";

const HIGHLIGHT_LABEL = new Map<string, string>(REVIEW_HIGHLIGHTS.map(({ key, label }) => [key, label]));

type Tab = "pending" | "submitted";

export default function CustomerReviewsPage() {
  return (
    <AccountShell>
      <ReviewCenterView />
    </AccountShell>
  );
}

function ReviewCenterView() {
  const { accessToken } = useAuth();
  const [center, setCenter] = useState<ReviewCenter | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [tab, setTab] = useState<Tab>("pending");
  // The open form; the first load opens the most recent item.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [thanks, setThanks] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await getReviewCenter(accessToken);
      setCenter(data);
      setExpandedId((current) =>
        current && data.pending.some((item) => item.orderItemId === current)
          ? current
          : (data.pending[0]?.orderItemId ?? null),
      );
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, [accessToken]);

  useEffect(() => {
    // Defer to avoid a synchronous state update during the effect.
    const timer = setTimeout(reload, 0);
    return () => clearTimeout(timer);
  }, [reload]);

  const stats = center?.stats;

  return (
    <>
      <AccountPageHeader
        eyebrow="TRUNG TÂM NHẬN XÉT"
        title="Đánh giá sản phẩm"
        description="Chia sẻ trải nghiệm thực tế về độ tươi ngon, chất lượng đóng gói và dịch vụ giao hàng từ các vựa đối tác trên toàn quốc."
        aside={
          <dl className="flex shrink-0 gap-8 self-start sm:self-center">
            <div>
              <dt className="text-xs text-slate-500">Điểm trung bình bạn chấm</dt>
              <dd className="mt-1 flex items-center gap-1.5 text-2xl font-bold text-slate-900 tabular-nums">
                {stats && stats.submittedCount > 0 ? stats.averageRating.toFixed(1) : "—"}
                <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              </dd>
            </div>
            <div className="border-l border-slate-200 pl-8">
              <dt className="text-xs text-slate-500">Đã gửi</dt>
              <dd className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
                {stats?.submittedCount ?? "—"}
                <span className="ml-1 text-sm font-medium text-slate-500">nhận xét</span>
              </dd>
            </div>
          </dl>
        }
      />

      <div role="tablist" aria-label="Đánh giá" className="flex gap-6 border-b border-slate-200">
        <TabButton active={tab === "pending"} onClick={() => setTab("pending")} count={stats?.pendingCount} highlight>
          Chờ đánh giá
        </TabButton>
        <TabButton active={tab === "submitted"} onClick={() => setTab("submitted")} count={stats?.submittedCount}>
          Đã đánh giá
        </TabButton>
      </div>

      {thanks && (
        <p role="status" className="flex items-center gap-2 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {thanks}
        </p>
      )}

      {loadError ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-slate-700">Không tải được dữ liệu đánh giá.</p>
          <button
            type="button"
            onClick={() => void reload()}
            className="mt-3 text-sm font-semibold text-[#0F3860] hover:underline"
          >
            Thử lại
          </button>
        </div>
      ) : !center || !accessToken ? (
        <div className="flex justify-center py-16 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : tab === "pending" ? (
        center.pending.length === 0 ? (
          <EmptyState
            title="Không còn sản phẩm nào chờ đánh giá"
            description="Sản phẩm trong các đơn giao thành công sẽ hiện ở đây."
          />
        ) : (
          <div className="space-y-4">
            {groupByOrder(center.pending).map((items) => (
              <PendingOrderCard
                key={items[0]!.orderNumber}
                orderNumber={items[0]!.orderNumber}
                vendorName={items[0]!.vendorName}
                deliveredAt={items[0]!.deliveredAt}
                items={items}
                token={accessToken}
                anonymousName={center.anonymousName}
                imageUploadEnabled={center.imageUploadEnabled}
                expandedId={expandedId}
                onExpand={(id) => {
                  setThanks(null);
                  setExpandedId(id);
                }}
                onLater={() => setExpandedId(null)}
                onSubmitted={(item) => {
                  setThanks(`Đã đăng đánh giá cho "${item.product.name}". Cảm ơn bạn!`);
                  setExpandedId(null);
                  void reload();
                }}
              />
            ))}
          </div>
        )
      ) : center.submitted.length === 0 ? (
        <EmptyState title="Bạn chưa có đánh giá nào" description="Hãy chia sẻ trải nghiệm sau khi nhận hàng nhé." />
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {center.submitted.map((review) => (
            <SubmittedReviewRow key={review.id} review={review} anonymousName={center.anonymousName} />
          ))}
        </ul>
      )}

      <ReviewPolicy />
    </>
  );
}

function TabButton({
  active,
  onClick,
  count,
  highlight,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count?: number;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`-mb-px flex items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition ${
        active ? "border-[#0F3860] text-[#0F3860]" : "border-transparent text-slate-500 hover:text-slate-800"
      }`}
    >
      {children}
      {count !== undefined && count > 0 && (
        <span
          className={`rounded-full px-1.5 text-xs tabular-nums ${
            highlight ? "bg-[#E63946] text-white" : "bg-slate-100 text-slate-600"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function SubmittedReviewRow({ review, anonymousName }: { review: SubmittedReview; anonymousName: string }) {
  return (
    <li className="flex gap-4 p-5">
      <Link href={`/products/${review.product.id}`} className="shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={review.product.imageUrl ?? FALLBACK_PRODUCT_IMAGE}
          alt={review.product.name}
          className="h-14 w-14 rounded-lg object-cover"
        />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <Link href={`/products/${review.product.id}`} className="font-semibold text-slate-900 hover:text-[#0F3860]">
            {review.product.name}
          </Link>
          <span className="text-xs text-slate-400">{formatDate(review.createdAt)}</span>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <span className="flex" aria-label={`${review.rating} sao`}>
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                className={`h-3.5 w-3.5 ${i < review.rating ? "fill-amber-400 text-amber-400" : "fill-slate-100 text-slate-200"}`}
              />
            ))}
          </span>
          {review.orderNumber && <span>Đơn #{review.orderNumber}</span>}
          {review.isAnonymous && <span>Ẩn danh ({anonymousName})</span>}
          {review.isHidden && <span className="font-semibold text-amber-700">Đang bị ẩn</span>}
        </div>

        {review.content && <p className="mt-2 text-sm leading-relaxed text-slate-700">{review.content}</p>}

        {review.highlights.length > 0 && (
          <p className="mt-2 text-xs text-slate-500">
            {review.highlights.map((key) => HIGHLIGHT_LABEL.get(key) ?? key).join(" · ")}
          </p>
        )}

        {review.imageUrls.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {review.imageUrls.map((url, index) => (
              <a key={url} href={url} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Ảnh ${index + 1}`} className="h-16 w-16 rounded-lg object-cover" />
              </a>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 px-6 py-14 text-center">
      <p className="font-semibold text-slate-800">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <Link href="/products" className="mt-4 inline-block text-sm font-semibold text-[#0F3860] hover:underline">
        Tiếp tục mua sắm →
      </Link>
    </div>
  );
}

const POLICY_ITEMS = [
  {
    icon: Camera,
    title: "+200 xu",
    description: "khi đánh giá có ảnh hải sản thực tế hoặc lúc chế biến xong.",
  },
  {
    icon: Video,
    title: "+500 xu",
    description: "cho video mở thùng từ 10 giây, thấy rõ quy cách đóng thùng oxy.",
  },
  {
    icon: ShieldCheck,
    title: "Đổi trả ưu tiên",
    description: "khách đánh giá tích cực được duyệt hoàn tiền/đổi bù trong 15 phút.",
  },
];

function ReviewPolicy() {
  return (
    <section className="border-t border-slate-200 pt-5">
      <h2 className="text-sm font-semibold text-slate-900">Chính sách đánh giá & thưởng xu</h2>
      <ul className="mt-3 grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-3">
        {POLICY_ITEMS.map(({ icon: Icon, title, description }) => (
          <li key={title} className="flex gap-2.5 text-sm text-slate-500">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#0F3860]" />
            <span>
              <span className="font-semibold text-slate-800">{title}</span> {description}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
