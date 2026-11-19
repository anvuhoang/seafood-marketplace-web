"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { ApiError } from "@/features/auth/api/auth.api";
import { useAuth } from "@/features/auth/context/AuthContext";
import { getMyStore } from "../api/vendor-store.api";
import type { VendorStore } from "../types/vendor-store.types";

export type MyStoreState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; store: VendorStore }
  | { kind: "no-store" }
  | { kind: "forbidden"; message: string }
  | { kind: "error"; message: string };

/*
 * One cached lookup of GET /vendors/me/store per signed-in session, shared by
 * every component that asks (console shell, settings page, storefront header),
 * so the API is called once instead of once per component.
 */
type Entry = { token: string; state: MyStoreState };

const IDLE: MyStoreState = { kind: "idle" };
const LOADING: MyStoreState = { kind: "loading" };
let entry: Entry | null = null;
let inFlight: { token: string; promise: Promise<void> } | null = null;
const listeners = new Set<() => void>();

function publish(next: Entry) {
  entry = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function toState(error: unknown): MyStoreState {
  if (error instanceof ApiError && error.statusCode === 404) return { kind: "no-store" };
  if (error instanceof ApiError && error.statusCode === 403) return { kind: "forbidden", message: error.message };
  return { kind: "error", message: error instanceof Error ? error.message : "Không thể tải hồ sơ gian hàng." };
}

/** Fetches the store for `token`. `quiet` keeps the current data on screen while reloading. */
function load(token: string, quiet = false): Promise<void> {
  if (inFlight?.token === token) return inFlight.promise;
  if (!quiet || entry?.token !== token) publish({ token, state: { kind: "loading" } });

  const promise = getMyStore(token)
    .then((store) => ({ kind: "ready", store }) as MyStoreState)
    .catch(toState)
    .then((state) => {
      // A newer session may have started meanwhile; never overwrite it.
      if (inFlight?.token === token) inFlight = null;
      if (entry?.token === token) publish({ token, state });
    });
  inFlight = { token, promise };
  return promise;
}

/**
 * The signed-in vendor's own store. `idle` for guests and non-vendors.
 * `refresh` reloads it in the background; `setStore` applies a store the
 * caller already has (e.g. the PATCH response) without another request.
 */
export function useMyStore(): {
  state: MyStoreState;
  refresh: () => Promise<void>;
  setStore: (store: VendorStore) => void;
} {
  const { user, accessToken } = useAuth();
  const token = user?.role === "VENDOR" ? accessToken : null;
  const snapshot = useSyncExternalStore(
    subscribe,
    () => entry,
    () => null,
  );

  useEffect(() => {
    if (token && entry?.token !== token) void load(token);
  }, [token]);

  const refresh = useCallback(() => (token ? load(token, true) : Promise.resolve()), [token]);
  const setStore = useCallback(
    (store: VendorStore) => {
      if (token) publish({ token, state: { kind: "ready", store } });
    },
    [token],
  );

  // Until the effect starts the first request for this session, report loading.
  const state = !token ? IDLE : snapshot?.token === token ? snapshot.state : LOADING;
  return { state, refresh, setStore };
}
