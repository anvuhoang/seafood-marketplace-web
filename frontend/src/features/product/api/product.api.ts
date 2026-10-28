import { ProductDetail } from "../types/product.types";
import {
  flagshipProductMock,
  discontinuedProductMock,
} from "../data/product-detail.mock";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

/**
 * Fetch seafood product details by identifier (slug or UUID).
 * Connects to the backend API with seamless fallback to rich mock data.
 */
export async function getProductDetail(
  identifier: string
): Promise<ProductDetail> {
  // Check special mock cases for immediate response or testing
  if (identifier === "discontinued-sample" || identifier === "prod-discontinued") {
    return discontinuedProductMock;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/products/${identifier}`, {
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      return {
        ...flagshipProductMock,
        ...data,
        images:
          data.images && data.images.length > 0
            ? data.images
            : flagshipProductMock.images,
        vendor: {
          ...flagshipProductMock.vendor,
          ...(data.vendor || {}),
        },
        specifications: {
          ...flagshipProductMock.specifications,
          ...(data.specifications || {}),
        },
        reviewsSummary: {
          ...flagshipProductMock.reviewsSummary,
          ...(data.reviewsSummary || {}),
        },
        relatedProducts: flagshipProductMock.relatedProducts,
      };
    }
  } catch (err) {
    console.warn("Backend API unavailable, loading local product data:", err);
  }

  // Graceful fallback to flagship mock product
  return flagshipProductMock;
}

/**
 * Send Add To Cart payload to backend API.
 */
export async function addToCartBackendApi(data: {
  offerId: string;
  quantity: number;
  preparationOption?: string;
}) {
  try {
    const res = await fetch(`${API_BASE_URL}/cart/items`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const errorMsg =
        (Array.isArray(body?.message) ? body?.message.join(", ") : body?.message) ||
        "Không thể thêm sản phẩm vào giỏ hàng.";
      return { success: false, message: errorMsg };
    }

    return { success: true, message: body?.message || "Đã thêm vào giỏ hàng" };
  } catch {
    return { success: false, message: "Lỗi kết nối tới máy chủ" };
  }
}
