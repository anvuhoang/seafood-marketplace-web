"use client";

import type { ReactNode } from "react";
import { useMyStoreSlug } from "../hooks/useMyStoreSlug";

/**
 * Shows its children to everyone except the owner of the storefront `slug`.
 * For actions that only make sense for a visitor, such as following the store
 * or calling it: the owner has no use for them on their own page.
 *
 * This is a convenience, not a guard. Rules such as "an owner cannot buy from
 * their own store" belong on the server, where the buyer comes from the token.
 */
export function HideForStoreOwner({ slug, children }: { slug: string; children: ReactNode }) {
  const mySlug = useMyStoreSlug();
  return mySlug === slug ? null : <>{children}</>;
}
