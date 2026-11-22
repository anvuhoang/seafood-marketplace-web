"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/features/auth/api/auth.api";
import { useAuth } from "@/features/auth/context/AuthContext";
import { fetchLatestConversation, sendChatFeedback, streamChatMessage } from "../api/chat.api";
import type { ChatFeedback, ChatMessage } from "../types/chat.types";

const CONNECTION_ERROR = "Không thể kết nối tới trợ lý. Bạn kiểm tra mạng và thử lại nhé.";
const STOPPED = "Đã dừng trả lời.";

const isLocal = (id: string) => id.startsWith("local-");

/**
 * The state of one chat: its messages, the answer being written and the actions on it. The answer arrives as
 * a stream, and every event of the stream changes the last message, so the text appears word by word.
 */
export function useChat() {
  const { accessToken } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const busyRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const counter = useRef(0);
  const restored = useRef(false);
  const previousToken = useRef<string | null>(null);

  const clear = useCallback(() => {
    abortRef.current?.abort();
    busyRef.current = false;
    setBusy(false);
    setMessages([]);
    setConversationId(null);
  }, []);

  // Signing out empties the chat, so the next person on a shared computer does not see someone's orders.
  useEffect(() => {
    if (previousToken.current && !accessToken) {
      clear();
      restored.current = false;
    }
    previousToken.current = accessToken;
  }, [accessToken, clear]);

  /** Brings back the visitor's last conversation. Called when the chat is first opened. */
  const restore = useCallback(async () => {
    if (restored.current || busyRef.current) return;
    restored.current = true;
    setRestoring(true);
    try {
      const saved = await fetchLatestConversation(accessToken);
      if (saved.conversationId && saved.messages.length > 0) {
        setConversationId(saved.conversationId);
        setMessages(
          saved.messages.map((message) => ({
            id: message.id,
            role: message.role,
            content: message.content,
            cards: message.cards,
            sources: message.sources,
            feedback: message.feedback,
          })),
        );
      }
    } catch {
      // No history is not an error: the chat just starts empty.
    } finally {
      setRestoring(false);
    }
  }, [accessToken]);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busyRef.current) return;

      const n = ++counter.current;
      let currentId = `local-a${n}`;
      const patch = (change: (message: ChatMessage) => ChatMessage) =>
        setMessages((list) => list.map((message) => (message.id === currentId ? change(message) : message)));

      setMessages((list) => [
        ...list,
        { id: `local-u${n}`, role: "USER", content: text, cards: [], sources: [], feedback: null },
        { id: currentId, role: "ASSISTANT", content: "", cards: [], sources: [], feedback: null, pending: true, activity: null },
      ]);
      busyRef.current = true;
      setBusy(true);
      const abort = new AbortController();
      abortRef.current = abort;

      try {
        await streamChatMessage({
          token: accessToken,
          message: text,
          conversationId,
          signal: abort.signal,
          onEvent: (event) => {
            switch (event.type) {
              case "conversation":
                setConversationId(event.conversationId);
                break;
              case "status":
                patch((message) => ({ ...message, activity: event.label }));
                break;
              case "token":
                patch((message) => ({ ...message, content: message.content + event.text, activity: null }));
                break;
              case "cards":
                patch((message) => ({ ...message, cards: [...message.cards, ...event.cards] }));
                break;
              case "sources":
                patch((message) => ({ ...message, sources: event.sources }));
                break;
              case "done": {
                const previous = currentId;
                currentId = event.messageId;
                setMessages((list) =>
                  list.map((message) => (message.id === previous ? { ...message, id: event.messageId, pending: false, activity: null } : message)),
                );
                break;
              }
              case "error":
                patch((message) => ({ ...message, content: event.message, failed: true, pending: false, activity: null }));
                break;
            }
          },
        });
        // A stream that ended without "done" or "error" (connection dropped) must not stay "typing" forever.
        patch((message) =>
          message.pending ? { ...message, pending: false, activity: null, content: message.content || CONNECTION_ERROR, failed: !message.content } : message,
        );
      } catch (error) {
        if (abort.signal.aborted) {
          patch((message) => ({ ...message, pending: false, activity: null, content: message.content || STOPPED }));
        } else {
          // The conversation was not found (for example it belonged to someone else): the next message starts a new one.
          if (error instanceof ApiError && error.statusCode === 404) setConversationId(null);
          const reason = error instanceof ApiError ? error.message : CONNECTION_ERROR;
          patch((message) => ({ ...message, content: reason, failed: true, pending: false, activity: null }));
        }
      } finally {
        busyRef.current = false;
        setBusy(false);
        abortRef.current = null;
      }
    },
    [accessToken, conversationId],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  /** Thumbs up or down; pressing the same one again takes it back. */
  const rate = useCallback(
    async (messageId: string, value: ChatFeedback) => {
      if (isLocal(messageId)) return;
      const before = messages.find((message) => message.id === messageId)?.feedback ?? null;
      const next = before === value ? null : value;
      const set = (feedback: ChatFeedback | null) =>
        setMessages((list) => list.map((message) => (message.id === messageId ? { ...message, feedback } : message)));
      set(next);
      try {
        await sendChatFeedback(accessToken, messageId, next ?? "NONE");
      } catch {
        set(before);
      }
    },
    [accessToken, messages],
  );

  // Closing the page cancels the answer being written, so nothing is spent on it.
  useEffect(() => () => abortRef.current?.abort(), []);

  return { messages, conversationId, busy, restoring, send, stop, rate, restore, reset: clear };
}
