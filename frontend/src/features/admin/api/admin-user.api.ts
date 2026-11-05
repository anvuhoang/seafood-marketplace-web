import { authenticatedRequest } from "@/features/auth/api/auth.api";
import { AdminUserList, AdminUserQuery } from "../types/admin-user.types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export function getAdminUsers(token: string, query: AdminUserQuery): Promise<AdminUserList> {
  const params = new URLSearchParams();
  if (query.role) params.set("role", query.role);
  if (query.status) params.set("status", query.status);
  if (query.q) params.set("q", query.q);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  const suffix = params.size > 0 ? `?${params}` : "";

  return authenticatedRequest<AdminUserList>(`${API_BASE_URL}/admin/users${suffix}`, token);
}
