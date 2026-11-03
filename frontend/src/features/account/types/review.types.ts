export const REVIEW_CONTENT_MIN_LENGTH = 10;
export const REVIEW_CONTENT_MAX_LENGTH = 500;
export const REVIEW_MAX_IMAGES = 5;

/** Same keys as the backend; the labels live here. */
export const REVIEW_HIGHLIGHTS = [
  { key: "fresh-lively", label: "Hải sản tươi sống bơi khỏe" },
  { key: "oxygen-packing", label: "Đóng thùng oxy chuẩn" },
  { key: "on-time", label: "Giao đúng hẹn" },
  { key: "accurate-weight", label: "Trọng lượng chuẩn cân" },
  { key: "firm-sweet", label: "Thịt chắc ngọt" },
  { key: "helpful-advice", label: "Tư vấn nhiệt tình" },
] as const;

export type ReviewHighlight = (typeof REVIEW_HIGHLIGHTS)[number]["key"];

export const RATING_TEXT: Record<number, string> = {
  1: "Rất không hài lòng",
  2: "Chưa hài lòng",
  3: "Tạm ổn",
  4: "Tươi ngon, hài lòng",
  5: "Cực kỳ tươi ngon, hài lòng!",
};

export interface ReviewProduct {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
}

export interface PendingReviewItem {
  orderItemId: string;
  orderNumber: string;
  vendorName: string;
  deliveredAt: string;
  product: ReviewProduct;
  variantName: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface SubmittedReview {
  id: string;
  rating: number;
  content: string | null;
  highlights: string[];
  isAnonymous: boolean;
  isHidden: boolean;
  imageUrls: string[];
  createdAt: string;
  orderNumber: string | null;
  vendorName: string | null;
  product: ReviewProduct;
}

export interface ReviewCenter {
  stats: { pendingCount: number; submittedCount: number; averageRating: number };
  anonymousName: string;
  imageUploadEnabled: boolean;
  pending: PendingReviewItem[];
  submitted: SubmittedReview[];
}

export interface ReviewInput {
  orderItemId: string;
  rating: number;
  content: string;
  highlights: ReviewHighlight[];
  isAnonymous: boolean;
  imageUrls: string[];
}

export interface ReviewUploadSignature {
  uploadUrl: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  allowedFormats: string;
  maxFileSizeBytes: number;
}
