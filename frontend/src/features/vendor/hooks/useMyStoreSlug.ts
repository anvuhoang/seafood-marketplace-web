"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { getMyStore } from "../api/vendor-store.api";

/**
 * Slug of the signed-in vendor's own store, for linking to its storefront.
 * Null while loading, for non-vendors, and when the account has no store
 * (404) or the lookup fails, so callers can simply hide the link.
 */
export function useMyStoreSlug(): string | null {
  const { user, accessToken } = useAuth();
  const token = user?.role === "VENDOR" ? accessToken : null;
  const [result, setResult] = useState<{ token: string; slug: string | null } | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    getMyStore(token)
      .then((store) => {
        if (active) setResult({ token, slug: store.slug });
      })
      .catch(() => {
        if (active) setResult({ token, slug: null });
      });
    return () => {
      active = false;
    };
  }, [token]);

  // Ignore a result fetched for a previous session.
  return token && result?.token === token ? result.slug : null;
}
