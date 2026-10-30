import { ProductDetail } from "../types/product.types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

/**
 * Fetch seafood product details by identifier (slug or UUID).
 * Returns null when the product does not exist; throws on other failures so
 * the page can show an error instead of made-up data.
 */
export async function getProductDetail(
  identifier: string
): Promise<ProductDetail | null> {
  const res = await fetch(
    `${API_BASE_URL}/products/${encodeURIComponent(identifier)}`,
    { cache: "no-store" },
  );

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error(`Product detail request failed with status ${res.status}`);
  }

  return res.json();
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
