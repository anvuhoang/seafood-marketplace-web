import { authenticatedRequest } from "@/features/auth/api/auth.api";
import type {
  AdminChatHealth,
  AdminChatConversationDetail,
  AdminChatConversationList,
  AdminChatStats,
  AdminHandoff,
  HandoffStatus,
  KnowledgeSyncResult,
} from "../types/admin-chat.types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const BASE = `${API_BASE_URL}/admin/chat`;

const noStore: RequestInit = { cache: "no-store" };

export const getChatStats = (token: string) => authenticatedRequest<AdminChatStats>(`${BASE}/stats`, token, noStore);

export function getChatConversations(token: string, query: { page?: number; feedback?: "DOWN"; handoff?: "true" }) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value !== undefined) search.set(key, String(value));
  const text = search.toString();
  return authenticatedRequest<AdminChatConversationList>(`${BASE}/conversations${text ? `?${text}` : ""}`, token, noStore);
}

export const getChatConversation = (token: string, id: string) =>
  authenticatedRequest<AdminChatConversationDetail>(`${BASE}/conversations/${encodeURIComponent(id)}`, token, noStore);

export const getChatHandoffs = (token: string, status?: HandoffStatus) =>
  authenticatedRequest<AdminHandoff[]>(`${BASE}/handoffs${status ? `?status=${status}` : ""}`, token, noStore);

export const updateChatHandoff = (token: string, id: string, status: HandoffStatus) =>
  authenticatedRequest<AdminHandoff>(`${BASE}/handoffs/${encodeURIComponent(id)}`, token, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

export const syncChatKnowledge = (token: string) =>
  authenticatedRequest<KnowledgeSyncResult>(`${BASE}/knowledge/sync`, token, { method: "POST" });

export const getChatHealth = (token: string) => authenticatedRequest<AdminChatHealth>(`${BASE}/health`, token, noStore);
