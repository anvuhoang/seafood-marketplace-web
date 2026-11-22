import { authenticatedRequest } from "@/features/auth/api/auth.api";
import { AdminCategory, AdminCategoryList, CategoryInput } from "../types/admin-category.types";

import { API_BASE_URL } from "@/lib/api-base";

const BASE = `${API_BASE_URL}/admin/categories`;
const JSON_HEADERS = { "Content-Type": "application/json" };

/** Every category, inactive ones included. Filtering happens in the page, so the parent list stays complete. */
export function getAdminCategories(token: string): Promise<AdminCategoryList> {
  return authenticatedRequest<AdminCategoryList>(BASE, token);
}

export function createCategory(token: string, input: CategoryInput): Promise<AdminCategory> {
  return authenticatedRequest<AdminCategory>(BASE, token, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  });
}

export function updateCategory(token: string, id: string, input: CategoryInput): Promise<AdminCategory> {
  return authenticatedRequest<AdminCategory>(`${BASE}/${encodeURIComponent(id)}`, token, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  });
}

export function setCategoryActive(token: string, id: string, active: boolean): Promise<AdminCategory> {
  return authenticatedRequest<AdminCategory>(
    `${BASE}/${encodeURIComponent(id)}/${active ? "reactivate" : "deactivate"}`,
    token,
    { method: "POST" },
  );
}

/** Only works for a category no product uses and without subcategories. */
export function deleteCategory(token: string, id: string): Promise<void> {
  return authenticatedRequest<void>(`${BASE}/${encodeURIComponent(id)}`, token, { method: "DELETE" });
}
