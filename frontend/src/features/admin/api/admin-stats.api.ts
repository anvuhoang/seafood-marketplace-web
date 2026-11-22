import { authenticatedRequest } from "@/features/auth/api/auth.api";
import { AdminOverview } from "../types/admin-stats.types";

import { API_BASE_URL } from "@/lib/api-base";

/** Every dashboard statistic in one request. */
export function getAdminOverview(token: string): Promise<AdminOverview> {
  return authenticatedRequest<AdminOverview>(`${API_BASE_URL}/admin/stats/overview`, token, {
    cache: "no-store",
  });
}
