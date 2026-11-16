import { authenticatedRequest } from "@/features/auth/api/auth.api";
import { AdminOverview } from "../types/admin-stats.types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

/** Every dashboard statistic in one request. */
export function getAdminOverview(token: string): Promise<AdminOverview> {
  return authenticatedRequest<AdminOverview>(`${API_BASE_URL}/admin/stats/overview`, token, {
    cache: "no-store",
  });
}
