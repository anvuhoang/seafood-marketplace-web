"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  Fish,
  Home,
  ImageOff,
  Loader2,
  PackageSearch,
  RotateCcw,
  ScanSearch,
  Search,
} from "lucide-react";
import { CatalogProductCard } from "@/features/catalog/components/CatalogProductCard";
import { useVisualSearch } from "../hooks/useVisualSearch";
import type { VisualSearchResult } from "../types/visual-search.types";
import { MATCHED_BY_NOTES, productsHref } from "../utils/presentation";
import { ImagePicker } from "./ImagePicker";
import { KeywordSearchForm } from "./KeywordSearchForm";
import {
  Alternatives,
  ErrorNotice,
  PhotoTips,
  PredictionDetails,
  SearchingState,
} from "./VisualSearchResultParts";

const STEPS = [
  "Chụp hoặc tải lên ảnh hải sản bạn muốn mua",
  "Hệ thống gợi ý loài hải sản có trong ảnh",
  "Xem các sản phẩm đang bán và chọn vựa phù hợp",
];

/** The full /visual-search page: photo on the left, recognition on the right, products and fallbacks below. */
export function VisualSearchView() {
  const { image, status, inputError, enabled, selectFile, clearImage, search } = useVisualSearch({ resume: true });
  const result = status.kind === "done" ? status.result : null;

  return (
    <>
      <section className="border-b border-slate-200 bg-sky-50/60">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500">
            <Link href="/" className="inline-flex items-center gap-1 hover:text-[#0F3860]">
              <Home className="h-3.5 w-3.5" aria-hidden="true" /> Trang chủ
            </Link>
            <ChevronRight className="h-3 w-3 text-slate-300" aria-hidden="true" />
            <span aria-current="page" className="font-medium text-slate-700">
              Tìm bằng hình ảnh
            </span>
          </nav>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-balance text-slate-900 sm:text-3xl">
            Tìm hải sản bằng hình ảnh
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Tải ảnh hải sản bạn muốn mua, hệ thống gợi ý loài có trong ảnh và các sản phẩm đang bán trên sàn.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {enabled === false && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="flex items-center gap-2 font-semibold text-amber-950">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" /> Tính năng tìm bằng hình ảnh tạm chưa sẵn sàng
            </p>
            <p className="mt-1 text-sm text-amber-900">Bạn vẫn có thể tìm hải sản bằng tên.</p>
            <div className="mt-4 max-w-md">
              <KeywordSearchForm label="Tìm bằng từ khóa" />
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <section aria-labelledby="vs-photo" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 id="vs-photo" className="mb-4 font-semibold text-slate-900">
              Ảnh của bạn
            </h2>
            <ImagePicker image={image} inputError={inputError} onSelect={selectFile} onClear={clearImage} />
            <button
              type="button"
              onClick={() => void search()}
              disabled={!image || status.kind === "searching" || enabled === false}
              aria-label="Tìm hải sản theo ảnh đã chọn"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#E63946] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#D62839] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status.kind === "searching" ? (
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <Search className="h-4 w-4" aria-hidden="true" />
              )}
              Tìm hải sản
            </button>
          </section>

          <section
            aria-labelledby="vs-result"
            aria-live="polite"
            aria-busy={status.kind === "searching"}
            className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
          >
            <h2 id="vs-result" className="flex items-center gap-2 font-semibold text-slate-900">
              <ScanSearch className="h-5 w-5 text-[#0F3860]" aria-hidden="true" /> Kết quả nhận diện
            </h2>

            {status.kind === "searching" ? (
              <SearchingState />
            ) : status.kind === "error" ? (
              <ErrorNotice message={status.message} statusCode={status.statusCode} onRetry={() => void search()} />
            ) : result?.outcome === "not_seafood" ? (
              <NotSeafood onRetry={clearImage} />
            ) : result ? (
              <PredictionDetails result={result} />
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
          </section>
        </div>

        {result && result.outcome === "matched" && <ProductsSection result={result} />}
        {result && result.outcome === "no_products" && <NoProducts result={result} />}
        {result &&
          result.outcome !== "not_seafood" &&
          (result.outcome === "uncertain" || result.imageQuality !== "good") && (
            <Uncertain result={result} onRetry={clearImage} />
          )}
      </div>
    </>
  );
}

function ProductsSection({ result }: { result: VisualSearchResult }) {
  const label = result.prediction?.label;
  const note = result.matchedBy ? MATCHED_BY_NOTES[result.matchedBy] : undefined;
  const title =
    result.matchedBy === "species" && label ? `Sản phẩm ${label} đang bán` : "Sản phẩm gợi ý đang bán";

  return (
    <section aria-labelledby="vs-products" className="mt-10">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 id="vs-products" className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {title}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Tìm thấy <span className="font-semibold text-slate-900">{result.totalProducts} sản phẩm</span>
          </p>
          {note && <p className="mt-1 text-sm text-amber-900">{note}</p>}
        </div>
        {result.searchQuery && (
          <Link
            href={productsHref(result.searchQuery)}
            className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-[#0F3860] underline-offset-4 hover:underline"
          >
            Xem tất cả
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {result.products.map((product) => (
          <CatalogProductCard key={product.id} product={product} view="grid" />
        ))}
      </div>
    </section>
  );
}

function NoProducts({ result }: { result: VisualSearchResult }) {
  const label = result.prediction?.label ?? "loại này";
  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-semibold text-slate-900">
        <PackageSearch className="h-5 w-5 text-[#0F3860]" aria-hidden="true" /> Chưa có vựa nào đang bán {label}
      </h2>
      <p className="mt-1.5 text-sm text-slate-600">
        Bạn có thể tìm bằng từ khóa để xem các sản phẩm gần giống, hoặc thử các loài được gợi ý bên dưới.
      </p>
      <Link
        href={productsHref(result.searchQuery)}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#0F3860] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0A2744]"
      >
        <Search className="h-4 w-4" aria-hidden="true" /> Tìm bằng từ khóa
      </Link>
      {result.alternatives.length > 0 && (
        <div className="mt-5">
          <Alternatives result={result} />
        </div>
      )}
    </section>
  );
}

function Uncertain({ result, onRetry }: { result: VisualSearchResult; onRetry: () => void }) {
  const unsure = result.outcome === "uncertain";
  return (
    <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/60 p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-semibold text-slate-900">
        <ImageOff className="h-5 w-5 text-amber-700" aria-hidden="true" />
        {unsure ? "Chưa nhận diện chắc chắn" : "Ảnh chưa thật rõ"}
      </h2>
      <p className="mt-1.5 text-sm text-slate-700">
        {unsure
          ? "Hệ thống chưa đủ chắc chắn để gợi ý sản phẩm. Hãy thử ảnh khác hoặc nhập tên hải sản."
          : "Kết quả trên có thể chưa đúng. Một ảnh rõ hơn sẽ cho gợi ý tốt hơn."}
      </p>
      <p className="mt-4 text-xs font-semibold text-slate-700">Mẹo chụp ảnh</p>
      <div className="mt-2">
        <PhotoTips />
      </div>
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#0F3860] ring-1 ring-slate-300 hover:bg-slate-50"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" /> Thử ảnh khác
        </button>
        <div className="w-full sm:max-w-md">
          <KeywordSearchForm defaultValue={result.searchQuery} />
        </div>
      </div>
    </section>
  );
}

function NotSeafood({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-xl bg-slate-50 p-4">
        <p className="flex items-center gap-2 font-semibold text-slate-900">
          <Fish className="h-4 w-4 text-[#0F3860]" aria-hidden="true" /> Ảnh này có vẻ không phải hải sản
        </p>
        <p className="mt-1.5 text-sm text-slate-600">
          Hãy chọn ảnh chụp rõ con hải sản bạn muốn mua, hoặc nhập tên để tìm.
        </p>
      </div>
      <PhotoTips />
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#0F3860] ring-1 ring-slate-300 hover:bg-slate-50"
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" /> Thử ảnh khác
      </button>
      <KeywordSearchForm />
    </div>
  );
}
