"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ApiError } from "@/features/auth/api/auth.api";
import { useAuth } from "@/features/auth/context/AuthContext";
import { getVendorDashboard } from "../api/vendor.api";
import type { VendorDashboard } from "../types/vendor.types";

export type VendorDashboardState =
  | { kind: "loading" }
  | { kind: "ready"; dashboard: VendorDashboard }
  | { kind: "no-store" }
  | { kind: "error"; message: string };

const DashboardContext = createContext<VendorDashboardState | null>(null);

/**
 * Loads GET /vendors/me/dashboard once for the console. It is reloaded on every
 * page change (keeping the old numbers on screen meanwhile), so the order badge
 * in the sidebar follows the vendor around without its own request.
 */
export function VendorDashboardProvider({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuth();
  const pathname = usePathname();
  const [result, setResult] = useState<{ token: string; state: VendorDashboardState } | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    getVendorDashboard(accessToken)
      .then((dashboard) => active && setResult({ token: accessToken, state: { kind: "ready", dashboard } }))
      .catch((error: unknown) => {
        if (!active) return;
        const state: VendorDashboardState =
          error instanceof ApiError && error.statusCode === 404
            ? { kind: "no-store" }
            : { kind: "error", message: error instanceof Error ? error.message : "Không thể tải số liệu gian hàng." };
        setResult({ token: accessToken, state });
      });
    return () => {
      active = false;
    };
  }, [accessToken, pathname]);

  const state: VendorDashboardState =
    accessToken && result?.token === accessToken ? result.state : { kind: "loading" };
  return <DashboardContext.Provider value={state}>{children}</DashboardContext.Provider>;
}

export function useVendorDashboard(): VendorDashboardState {
  const state = useContext(DashboardContext);
  if (!state) throw new Error("useVendorDashboard must be used inside VendorDashboardProvider");
  return state;
}
