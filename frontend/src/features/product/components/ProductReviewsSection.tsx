import { ReviewsSummary } from "../types/product.types";
import { MessageSquare, Star } from "lucide-react";

interface ProductReviewsSectionProps {
  summary: ReviewsSummary;
}

const initialsOf = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(-2)
    .join("")
    .toUpperCase();

export function ProductReviewsSection({ summary }: ProductReviewsSectionProps) {
  return (
    <div id="product-reviews" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">Đánh giá từ người mua</h2>
        <p className="text-xs text-slate-400">Đánh giá được khách hàng gửi sau khi mua sản phẩm</p>
      </div>

      {summary.reviewCount === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <MessageSquare className="h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm font-bold text-slate-700">Chưa có đánh giá nào</p>
          <p className="text-xs text-slate-400">Hãy là người đầu tiên đánh giá sau khi mua sản phẩm này.</p>
        </div>
      ) : (
        <>
          {/* Rating Breakdown Overview */}
          <div className="flex flex-col sm:flex-row items-center gap-8 rounded-xl bg-slate-50 p-5 border border-slate-100">
            <div className="text-center sm:text-left sm:pr-8 sm:border-r border-slate-200">
              <div className="text-4xl font-bold text-[#0F3860]">{summary.ratingAverage.toFixed(1)}</div>
              <div className="flex items-center justify-center sm:justify-start gap-1 my-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= Math.round(summary.ratingAverage)
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-300"
                    }`}
                  />
                ))}
              </div>
              <div className="text-xs text-slate-500 font-medium">{summary.reviewCount} đánh giá</div>
            </div>

            <div className="flex-1 w-full space-y-1.5 text-xs text-slate-600">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = summary.ratingBreakdown[stars] || 0;
                const percent = Math.round((count / summary.reviewCount) * 100);
                return (
                  <div key={stars} className="flex items-center gap-3">
                    <span className="w-10 text-right font-medium">{stars} sao</span>
                    <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div className="h-full bg-[#E63946] rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                    <span className="w-8 text-slate-400 text-[11px]">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent reviews */}
          <div className="space-y-4">
            {summary.reviews.map((review) => (
              <div key={review.id} className="rounded-xl border border-slate-100 p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-[#0F3860]">
                    {initialsOf(review.authorName)}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">{review.authorName}</h3>
                    <p className="text-[11px] text-slate-400">
                      {new Date(review.createdAt).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5" aria-label={`${review.rating} sao`}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
                    />
                  ))}
                </div>
                {review.content && <p className="text-xs leading-relaxed text-slate-700">{review.content}</p>}
                {review.imageUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {review.imageUrls.map((url, index) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer" className="block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Ảnh thực tế ${index + 1} của ${review.authorName}`}
                          loading="lazy"
                          className="h-16 w-16 rounded-lg border border-slate-100 object-cover"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
