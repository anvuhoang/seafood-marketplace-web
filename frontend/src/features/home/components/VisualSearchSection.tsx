"use client";

import Link from "next/link";
import { ArrowRight, Loader2, ScanSearch, Search } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { CatalogProductCard } from "@/features/catalog/components/CatalogProductCard";
import { ImagePicker } from "@/features/visual-search/components/ImagePicker";
import { KeywordSearchForm } from "@/features/visual-search/components/KeywordSearchForm";
import {
  ConfidenceBadge,
  Disclaimer,
  ErrorNotice,
  SearchingState,
  predictionSentence,
} from "@/features/visual-search/components/VisualSearchResultParts";
import { useVisualSearch } from "@/features/visual-search/hooks/useVisualSearch";
import type { VisualSearchResult } from "@/features/visual-search/types/visual-search.types";
import { IMAGE_QUALITY_NOTES, MATCHED_BY_NOTES, productsHref } from "@/features/visual-search/utils/presentation";

const STEPS = [
  "Chụp hoặc tải lên ảnh hải sản bạn muốn mua",
  "Hệ thống gợi ý loài hải sản có trong ảnh",
  "Chọn vựa đang bán với giá phù hợp",
];

/** Compact visual search on the home page; "Xem chi tiết" opens /visual-search with the same result. */
export function VisualSearchSection() {
  const { image, status, inputError, enabled, selectFile, clearImage, search } = useVisualSearch();

  return (
    <section id="visual-search" className="scroll-mt-32 bg-white py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Tìm kiếm bằng AI"
          title="Tìm hải sản bằng hình ảnh"
          description="Tải ảnh loại hải sản bạn muốn mua, hệ thống gợi ý loài có trong ảnh và các vựa đang bán để bạn so sánh."
          actionHref="/visual-search"
          actionLabel="Mở trang tìm bằng ảnh"
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <ScrollReveal>
            <ImagePicker image={image} inputError={inputError} onSelect={selectFile} onClear={clearImage} />
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => void search()}
                disabled={!image || status.kind === "searching" || enabled === false}
                aria-label="Tìm hải sản theo ảnh đã chọn"
                className="inline-flex items-center gap-2 rounded-lg bg-[#E63946] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#D62839] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status.kind === "searching" ? (
                  <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  <Search className="h-4 w-4" aria-hidden="true" />
                )}
                Tìm hải sản
              </button>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={120} className="rounded-2xl border border-slate-200 p-6 sm:p-8">
            <div aria-live="polite" aria-busy={status.kind === "searching"}>
              <h3 className="flex items-center gap-2 font-semibold text-slate-900">
                <ScanSearch className="h-5 w-5 text-[#0F3860]" aria-hidden="true" /> Kết quả nhận diện
              </h3>

              {enabled === false && status.kind !== "done" ? (
                <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">
                  <p className="font-semibold">Tính năng tìm bằng hình ảnh tạm chưa sẵn sàng.</p>
                  <div className="mt-3">
                    <KeywordSearchForm label="Tìm bằng từ khóa" />
                  </div>
                </div>
              ) : status.kind === "searching" ? (
                <SearchingState />
              ) : status.kind === "error" ? (
                <ErrorNotice message={status.message} statusCode={status.statusCode} onRetry={() => void search()} />
              ) : status.kind === "done" ? (
                <CompactResult result={status.result} />
              ) : (
                <ol className="mt-6 space-y-5">
                  {STEPS.map((step, index) => (
                    <li key={step} className="flex gap-4">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sm font-semibold text-[#0F3860] tabular-nums">
                        {index + 1}
                      </span>
                      <p className="pt-1 text-sm leading-relaxed text-slate-600">{step}</p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}

function CompactResult({ result }: { result: VisualSearchResult }) {
  const prediction = result.prediction;
  const details = (
    <Link
      href="/visual-search"
      className="group inline-flex items-center gap-1.5 text-sm font-semibold text-[#0F3860] underline-offset-4 hover:underline"
    >
      Xem chi tiết
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
    </Link>
  );

  if (result.outcome === "not_seafood" || !prediction) {
    return (
      <div className="mt-5 space-y-3 text-sm">
        <p className="font-semibold text-slate-900">Ảnh này có vẻ không phải hải sản.</p>
        <p className="text-slate-600">Hãy chọn ảnh chụp rõ con hải sản bạn muốn mua, hoặc nhập tên để tìm.</p>
        <KeywordSearchForm />
      </div>
    );
  }

  const quality = result.imageQuality === "good" ? null : IMAGE_QUALITY_NOTES[result.imageQuality];
  const note = result.matchedBy ? MATCHED_BY_NOTES[result.matchedBy] : undefined;

  return (
    <div className="mt-5 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-slate-700">{predictionSentence(prediction.label, prediction.confidenceLevel)}</p>
        <ConfidenceBadge level={prediction.confidenceLevel} confidence={prediction.confidence} />
      </div>
      {quality && <p className="text-sm text-amber-900">{quality}</p>}
      <Disclaimer text={result.disclaimer} />

      {result.outcome === "matched" ? (
        <>
          {note && <p className="text-sm text-amber-900">{note}</p>}
          <div className="grid grid-cols-2 gap-3">
            {result.products.slice(0, 4).map((product) => (
              <CatalogProductCard key={product.id} product={product} view="grid" />
            ))}
          </div>
        </>
      ) : result.outcome === "no_products" ? (
        <p className="text-sm text-slate-600">
          Chưa có vựa nào đang bán {prediction.label ?? "loại này"}.{" "}
          <Link href={productsHref(result.searchQuery)} className="font-semibold text-[#0F3860] underline underline-offset-4">
            Tìm bằng từ khóa
          </Link>
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Chưa nhận diện chắc chắn. Hãy thử ảnh rõ hơn hoặc nhập tên.</p>
          <KeywordSearchForm defaultValue={result.searchQuery} />
        </div>
      )}
      {details}
    </div>
  );
}
