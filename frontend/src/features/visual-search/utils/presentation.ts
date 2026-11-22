import type { ConfidenceLevel, ImageQuality, VisualSearchMatchedBy } from "../types/visual-search.types";

/** Bands are shown first: the number is the model's own estimate, not a measured accuracy. */
export const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  high: "Khá chắc chắn",
  medium: "Có thể là",
  low: "Chưa chắc chắn",
};

export const CONFIDENCE_STYLES: Record<ConfidenceLevel, string> = {
  high: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  medium: "bg-sky-50 text-sky-800 ring-sky-200",
  low: "bg-amber-50 text-amber-900 ring-amber-200",
};

export const IMAGE_QUALITY_NOTES: Record<Exclude<ImageQuality, "good">, string> = {
  blurry: "Ảnh hơi mờ nên kết quả có thể chưa đúng.",
  dark: "Ảnh hơi tối nên kết quả có thể chưa đúng.",
  too_far: "Hải sản trong ảnh khá nhỏ, hãy chụp gần hơn.",
  multiple_items: "Ảnh có nhiều loại khác nhau, hãy chụp mỗi loại một ảnh.",
};

export const MATCHED_BY_NOTES: Partial<Record<VisualSearchMatchedBy, string>> = {
  category: "Chưa có sản phẩm đúng loài này, đây là các sản phẩm cùng nhóm.",
  keyword: "Chưa có sản phẩm đúng loài này, đây là các sản phẩm liên quan.",
};

export const PHOTO_TIPS = [
  "Chụp nơi đủ sáng, tránh ngược sáng",
  "Chụp rõ cả con, không bị che khuất",
  "Mỗi ảnh chỉ một loại hải sản",
];

export const percent = (confidence: number) => `${Math.round(confidence * 100)}%`;

/** Keyword search on the catalogue page. */
export function productsHref(query: string | null | undefined): string {
  return query ? `/products?q=${encodeURIComponent(query)}` : "/products";
}

/** Short heading for an error, chosen by HTTP status (0 = no connection). */
export function errorTitle(statusCode: number | null): string {
  switch (statusCode) {
    case 0:
      return "Không kết nối được máy chủ";
    case 400:
    case 413:
      return "Ảnh chưa hợp lệ";
    case 429:
      return "Bạn đã tìm quá nhiều lần";
    case 502:
      return "Chưa đọc được kết quả nhận diện";
    case 503:
      return "Tính năng tạm chưa sẵn sàng";
    case 504:
      return "Dịch vụ nhận diện phản hồi chậm";
    default:
      return "Chưa tìm được bằng ảnh";
  }
}
