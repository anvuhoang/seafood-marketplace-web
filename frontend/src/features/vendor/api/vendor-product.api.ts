import { authenticatedRequest } from "@/features/auth/api/auth.api";
import type {
  CreateOfferInput,
  DraftProductInput,
  OfferAmounts,
  SettableOfferStatus,
  VendorCatalogList,
  VendorDraftProduct,
  VendorOffer,
  VendorOfferList,
  VendorOfferQuery,
} from "../types/vendor-product.types";
import { uploadSignedImage } from "./vendor-store.api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const ME = `${API_BASE_URL}/vendors/me`;

function queryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

/** The signed-in vendor's offers with store-wide counts. */
export function listMyOffers(token: string, query: VendorOfferQuery): Promise<VendorOfferList> {
  return authenticatedRequest<VendorOfferList>(`${ME}/offers${queryString({ ...query })}`, token, {
    cache: "no-store",
  });
}

/** Published products and the vendor's own drafts that an offer can be added to. */
export function searchCatalog(
  token: string,
  query: { search?: string; page?: number; pageSize?: number },
): Promise<VendorCatalogList> {
  return authenticatedRequest<VendorCatalogList>(`${ME}/catalog/products${queryString(query)}`, token, {
    cache: "no-store",
  });
}

export function createOffer(token: string, input: CreateOfferInput): Promise<VendorOffer> {
  return authenticatedRequest<VendorOffer>(`${ME}/offers`, token, json("POST", input));
}

export function updateOffer(token: string, offerId: string, input: Partial<OfferAmounts>): Promise<VendorOffer> {
  return authenticatedRequest<VendorOffer>(`${ME}/offers/${encodeURIComponent(offerId)}`, token, json("PATCH", input));
}

export function changeOfferStatus(token: string, offerId: string, status: SettableOfferStatus): Promise<VendorOffer> {
  return authenticatedRequest<VendorOffer>(
    `${ME}/offers/${encodeURIComponent(offerId)}/status`,
    token,
    json("PATCH", { status }),
  );
}

export function createDraftProduct(token: string, input: DraftProductInput): Promise<VendorDraftProduct> {
  return authenticatedRequest<VendorDraftProduct>(`${ME}/products`, token, json("POST", input));
}

export function getDraftProduct(token: string, productId: string): Promise<VendorDraftProduct> {
  return authenticatedRequest<VendorDraftProduct>(`${ME}/products/${encodeURIComponent(productId)}`, token, {
    cache: "no-store",
  });
}

export function updateDraftProduct(
  token: string,
  productId: string,
  input: Partial<DraftProductInput>,
): Promise<VendorDraftProduct> {
  return authenticatedRequest<VendorDraftProduct>(
    `${ME}/products/${encodeURIComponent(productId)}`,
    token,
    json("PATCH", input),
  );
}

/** Upload one product image into the vendor's product folder and return its URL. */
export function uploadProductImage(token: string, file: File): Promise<string> {
  return uploadSignedImage(token, `${ME}/products/upload-signature`, file);
}
