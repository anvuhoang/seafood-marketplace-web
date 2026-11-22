import { ApiError, handleResponse } from "@/features/auth/api/auth.api";
import type { ChatConversation, ChatFeedback, ChatStreamEvent, HandoffInput } from "../types/chat.types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const CHAT = `${API_BASE_URL}/chat`;
const SESSION_KEY = "haisan_chat_session";

let memorySession: string | null = null;

/**
 * A random id the browser keeps, so a guest's conversation can be told apart (and restored) without an account.
 * It is only a label for the conversation: what a signed-in customer may see is decided by their token.
 */
export function getChatSessionId(): string {
  try {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) return saved;
    const created = newSessionId();
    localStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    // Storage can be blocked (private window): the id then lives as long as the page.
    memorySession ??= newSessionId();
    return memorySession;
  }
}

function newSessionId(): string {
  return `s${crypto.randomUUID().replace(/-/g, "")}`;
}

function headers(token: string | null, json = true): HeadersInit {
  return {
    ...(json && { "Content-Type": "application/json" }),
    "X-Chat-Session": getChatSessionId(),
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

/** Whether the assistant is switched on. A server that cannot be reached counts as off, so no broken button shows. */
export async function fetchChatStatus(): Promise<boolean> {
  try {
    const res = await fetch(`${CHAT}/status`, { cache: "no-store" });
    if (!res.ok) return false;
    return Boolean((await res.json()).enabled);
  } catch {
    return false;
  }
}

/** The visitor's last conversation, to bring the chat back after a reload. */
export async function fetchLatestConversation(token: string | null): Promise<ChatConversation> {
  const res = await fetch(`${CHAT}/conversations/latest`, { headers: headers(token, false), cache: "no-store" });
  return handleResponse<ChatConversation>(res);
}

/**
 * Sends a message and reads the answer as it is written. `onEvent` is called for each event (status, text
 * pieces, cards...). Refusals that come before the stream starts (empty message, too many messages, assistant
 * off) are thrown as ApiError with the server's message.
 */
export async function streamChatMessage(params: {
  token: string | null;
  message: string;
  conversationId: string | null;
  signal: AbortSignal;
  onEvent: (event: ChatStreamEvent) => void;
}): Promise<void> {
  const res = await fetch(`${CHAT}/messages`, {
    method: "POST",
    headers: headers(params.token),
    body: JSON.stringify({ message: params.message, ...(params.conversationId && { conversationId: params.conversationId }) }),
    signal: params.signal,
  });
  if (!res.ok) await handleResponse(res);
  if (!res.body) throw new ApiError("Không nhận được phản hồi từ trợ lý.", 502);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");
    let end: number;
    while ((end = buffer.indexOf("\n\n")) !== -1) {
      const event = parseEvent(buffer.slice(0, end));
      buffer = buffer.slice(end + 2);
      if (event) params.onEvent(event);
    }
    if (done) break;
  }
}

function parseEvent(block: string): ChatStreamEvent | null {
  const data = block
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n");
  if (!data) return null;
  try {
    return JSON.parse(data) as ChatStreamEvent;
  } catch {
    return null;
  }
}

export async function sendChatFeedback(token: string | null, messageId: string, feedback: ChatFeedback | "NONE"): Promise<void> {
  const res = await fetch(`${CHAT}/messages/${encodeURIComponent(messageId)}/feedback`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ feedback }),
  });
  if (!res.ok) await handleResponse(res);
}

export async function createChatHandoff(token: string | null, input: HandoffInput): Promise<void> {
  const res = await fetch(`${CHAT}/handoff`, { method: "POST", headers: headers(token), body: JSON.stringify(input) });
  await handleResponse(res);
}
