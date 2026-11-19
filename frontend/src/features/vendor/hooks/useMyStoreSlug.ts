"use client";

import { useMyStore } from "./useMyStore";

/**
 * Slug of the signed-in vendor's own store, for linking to its storefront.
 * Null while loading, for non-vendors, and when the account has no store
 * (404) or the lookup fails, so callers can simply hide the link.
 */
export function useMyStoreSlug(): string | null {
  const { state } = useMyStore();
  return state.kind === "ready" ? state.store.slug : null;
}
