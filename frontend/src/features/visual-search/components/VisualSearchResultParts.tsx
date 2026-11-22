import Link from "next/link";
import { AlertCircle, Camera, Info, Lightbulb, RotateCcw, Search } from "lucide-react";
import type { ConfidenceLevel, VisualSearchResult } from "../types/visual-search.types";
import {
  CONFIDENCE_LABELS,
  CONFIDENCE_STYLES,
  IMAGE_QUALITY_NOTES,
  PHOTO_TIPS,
  errorTitle,
  percent,
  productsHref,
} from "../utils/presentation";
import { KeywordSearchForm } from "./KeywordSearchForm";

/** The band in words, with the model's own number kept small next to it. */
export function ConfidenceBadge({ level, confidence }: { level: ConfidenceLevel; confidence: number }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${CONFIDENCE_STYLES[level]}`}
    >
      {CONFIDENCE_LABELS[level]}
      <span className="font-normal opacity-75 tabular-nums" aria-label={`mô hình tự đánh giá ${percent(confidence)}`}>
        · {percent(confidence)}
      </span>
    </span>
  );
}

/** Never states the guess as fact. */
export function predictionSentence(label: string | null, level: ConfidenceLevel): string {
  if (!label) return "Chưa xác định được loài trong ảnh.";
  return level === "low" ? `Chưa chắc chắn, có thể là ${label}.` : `Có thể đây là ${label}.`;
}

export function Disclaimer({ text }: { text: string }) {
  return (
    <div className="flex gap-2.5 rounded-xl bg-sky-50 p-3.5 text-xs leading-relaxed text-slate-700">
      <Info className="mt-px h-4 w-4 shrink-0 text-[#0F3860]" aria-hidden="true" />
      <p>{text}</p>
    </div>
  );
}

export function SearchingState() {
  return (
    <div className="mt-5" role="status">
      <span className="sr-only">Đang phân tích ảnh...</span>
      <div className="animate-pulse space-y-3 motion-reduce:animate-none" aria-hidden="true">
        <div className="h-3 w-32 rounded bg-slate-200" />
        <div className="h-6 w-56 rounded bg-slate-200" />
        <div className="h-3 w-40 rounded bg-slate-100" />
        <div className="h-16 rounded-xl bg-slate-100" />
        <div className="grid grid-cols-3 gap-2.5">
          <div className="h-14 rounded-xl bg-slate-100" />
          <div className="h-14 rounded-xl bg-slate-100" />
          <div className="h-14 rounded-xl bg-slate-100" />
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-500">Đang phân tích ảnh, thường mất vài giây...</p>
    </div>
  );
}

/** Errors from the server or the network, each with the keyword search as a way out. */
export function ErrorNotice({
  message,
  statusCode,
  onRetry,
}: {
  message: string;
  statusCode: number | null;
  onRetry?: () => void;
}) {
  const canRetry = statusCode === 0 || statusCode === 502 || statusCode === 504;
  return (
    <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">
      <p className="flex items-center gap-2 font-semibold">
        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" /> {errorTitle(statusCode)}
      </p>
      <p className="mt-1.5 leading-relaxed">{message}</p>
      {canRetry && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 ring-1 ring-amber-200 hover:bg-amber-100"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /> Thử lại
        </button>
      )}
      <div className="mt-4">
        <KeywordSearchForm label="Tìm bằng từ khóa" />
      </div>
    </div>
  );
}

export function PhotoTips() {
  return (
    <ul className="grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
      {PHOTO_TIPS.map((tip) => (
        <li key={tip} className="flex items-start gap-2 rounded-lg bg-white p-2.5 ring-1 ring-slate-200">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          {tip}
        </li>
      ))}
    </ul>
  );
}

/** Full recognition details for the /visual-search page. */
export function PredictionDetails({ result }: { result: VisualSearchResult }) {
  const prediction = result.prediction;
  if (!prediction) return null;
  const quality = result.imageQuality === "good" ? null : IMAGE_QUALITY_NOTES[result.imageQuality];

  return (
    <div className="mt-5 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">Loài được gợi ý</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-balance text-slate-900">
            {prediction.label ?? "Chưa xác định"}
          </p>
          {prediction.scientificName && (
            <p className="mt-0.5 text-sm text-slate-500">
              Tên khoa học: <i>{prediction.scientificName}</i>
            </p>
          )}
        </div>
        <div className="shrink-0">
          <ConfidenceBadge level={prediction.confidenceLevel} confidence={prediction.confidence} />
        </div>
      </div>

      <p className="text-sm text-slate-700">{predictionSentence(prediction.label, prediction.confidenceLevel)}</p>
      {quality && (
        <p className="flex items-start gap-2 text-sm text-amber-900">
          <Camera className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {quality}
        </p>
      )}

      <Disclaimer text={result.disclaimer} />

      {prediction.features.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Đặc điểm nhận diện</h3>
          <ul className="mt-2 grid gap-2.5 sm:grid-cols-3">
            {prediction.features.map((feature, index) => (
              <li key={feature} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <p className="text-xs text-slate-500">Đặc điểm {index + 1}</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{feature}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.alternatives.length > 0 && <Alternatives result={result} />}
    </div>
  );
}

export function Alternatives({ result }: { result: VisualSearchResult }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900">Có thể là loài khác</h3>
      <ul className="mt-2 flex flex-wrap gap-2">
        {result.alternatives.map((alternative) => (
          <li key={alternative.speciesSlug}>
            <Link
              href={productsHref(alternative.label)}
              aria-label={`Tìm sản phẩm ${alternative.label}`}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-50 px-3 py-1.5 text-sm font-medium text-[#0F3860] hover:bg-sky-100"
            >
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
              {alternative.label}
              <span className="text-xs font-normal text-slate-500 tabular-nums">{percent(alternative.confidence)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
