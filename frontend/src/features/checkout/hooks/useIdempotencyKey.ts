"use client";

import { useCallback, useRef } from "react";

function newKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // Insecure pages have no randomUUID; this is still unique enough to tell two attempts apart.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * The idempotency key of the order being placed. The same content gets the same key, so a double click or a
 * retry after a lost answer is recognised by the server as one order; once anything in the order changes
 * the key changes too, so it is a new order. Call the returned function when submitting.
 */
export function useIdempotencyKey(payload: unknown): () => string {
  const current = useRef<{ payload: string; key: string } | null>(null);
  return useCallback(() => {
    const serialized = JSON.stringify(payload);
    if (current.current?.payload !== serialized) current.current = { payload: serialized, key: newKey() };
    return current.current.key;
  }, [payload]);
}
