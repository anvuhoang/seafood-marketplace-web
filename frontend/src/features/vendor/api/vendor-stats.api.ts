import { authenticatedRequest } from "@/features/auth/api/auth.api";
import type { VendorStats, VendorStatsQuery } from "../types/vendor-stats.types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

/** Revenue and order statistics of the signed-in vendor's store. The store comes from the token. */
export function getMyStats(token: string, query: VendorStatsQuery): Promise<VendorStats> {
  const search = new URLSearchParams({ range: query.range });
  if (query.range === "custom") {
    if (query.from) search.set("from", query.from);
    if (query.to) search.set("to", query.to);
  }
  return authenticatedRequest<VendorStats>(`${API_BASE_URL}/vendors/me/stats?${search}`, token, { cache: "no-store" });
}
