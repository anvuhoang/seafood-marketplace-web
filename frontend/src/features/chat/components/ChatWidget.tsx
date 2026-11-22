"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bot, MessageCircle, RotateCcw, SendHorizontal, Square, X } from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { cn } from "@/lib/utils";
import { fetchChatStatus } from "../api/chat.api";
import { useChat } from "../hooks/useChat";
import { ChatMessageBubble } from "./ChatMessageBubble";

/** Same limit as the server's CHAT_MAX_MESSAGE_LENGTH default; the server has the last word. */
const MAX_LENGTH = 500;
/** The consoles for admins and vendors have no shopping assistant. */
const HIDDEN_PREFIXES = ["/admin", "/vendor"];

const GUEST_SUGGESTIONS = [
  "Gợi ý hải sản nấu lẩu cho 4 người, ngân sách 800k",
  "Cách bảo quản ghẹ sống?",
  "Chính sách đổi trả thế nào?",
  "Phí giao hàng bao nhiêu?",
];
const MEMBER_SUGGESTIONS = [
  "Đơn hàng của tôi đang ở đâu?",
  "Mua lại đơn gần nhất của tôi",
  "Gợi ý hải sản cho bữa tối hôm nay",
  "Chính sách đổi trả thế nào?",
];

/**
 * The shopping assistant: a round button at the corner that opens a chat. It appears on the storefront only,
 * and only while the server says the assistant is switched on.
 */
export function ChatWidget() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();
  const chat = useChat();
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const stickToBottom = useRef(true);

  const hidden = HIDDEN_PREFIXES.some((prefix) => pathname?.startsWith(prefix));

  useEffect(() => {
    let current = true;
    fetchChatStatus().then((on) => current && setEnabled(on));
    return () => {
      current = false;
    };
  }, []);

  // The first time the chat opens, the last conversation comes back.
  const { restore } = chat;
  useEffect(() => {
    if (open) {
      void restore();
      inputRef.current?.focus();
    }
  }, [open, restore]);

  // Keeps the newest text in view, unless the visitor scrolled up to read.
  useEffect(() => {
    const list = listRef.current;
    if (list && stickToBottom.current) list.scrollTop = list.scrollHeight;
  }, [chat.messages, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        launcherRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!enabled || hidden) return null;

  function submit(text = draft) {
    const message = text.trim();
    if (!message || chat.busy) return;
    stickToBottom.current = true;
    setDraft("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    void chat.send(message);
  }

  const firstName = user?.fullName?.trim().split(/\s+/).pop();
  const suggestions = isAuthenticated ? MEMBER_SUGGESTIONS : GUEST_SUGGESTIONS;
  const empty = chat.messages.length === 0;

  return (
    <>
      {!open && (
        <button
          ref={launcherRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Mở trò chuyện với Cá Voi"
          className="fixed right-4 bottom-4 z-40 inline-flex items-center gap-2 rounded-full bg-[#0F3860] py-3 pr-4 pl-3.5 text-sm font-bold text-white shadow-lg transition-transform hover:scale-105 hover:bg-[#0A2744] motion-reduce:transition-none motion-reduce:hover:scale-100 sm:right-6 sm:bottom-6"
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
          <span className="hidden sm:inline">Chat với Cá Voi</span>
        </button>
      )}

      {open && (
        <section
          role="dialog"
          aria-label="Trò chuyện với Cá Voi"
          className="animate-slide-up fixed inset-0 z-50 flex h-dvh flex-col bg-white sm:inset-auto sm:right-6 sm:bottom-6 sm:h-[640px] sm:max-h-[calc(100dvh-3rem)] sm:w-[390px] sm:overflow-hidden sm:rounded-2xl sm:border sm:border-slate-200 sm:shadow-2xl"
        >
          <header className="flex items-center gap-3 bg-[#0F3860] px-4 py-3 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
              <Bot className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">Cá Voi</p>
              <p className="flex items-center gap-1.5 text-[11px] text-white/80">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                Trợ lý mua sắm HaiSan Express
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                chat.reset();
                inputRef.current?.focus();
              }}
              disabled={empty}
              aria-label="Bắt đầu cuộc trò chuyện mới"
              title="Cuộc trò chuyện mới"
              className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-40"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                launcherRef.current?.focus();
              }}
              aria-label="Đóng trò chuyện"
              className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </header>

          <div
            ref={listRef}
            onScroll={(event) => {
              const list = event.currentTarget;
              stickToBottom.current = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
            }}
            role="log"
            aria-live="polite"
            aria-label="Nội dung trò chuyện"
            className="flex-1 space-y-3 overflow-y-auto bg-white px-3.5 py-4"
          >
            {empty && (
              <div className="space-y-4">
                <div className="rounded-2xl rounded-bl-md bg-slate-100 px-3.5 py-3 text-sm text-slate-800">
                  <p className="font-bold">Xin chào{firstName ? ` ${firstName}` : ""}! 👋</p>
                  <p className="mt-1">Mình là Cá Voi. Mình có thể giúp bạn chọn hải sản tươi, tra đơn hàng và giải đáp chính sách của HaiSan Express.</p>
                </div>
                <div className="flex flex-wrap gap-2" aria-label="Gợi ý câu hỏi">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => submit(suggestion)}
                      disabled={chat.busy}
                      className="rounded-full border border-[#0F3860]/25 bg-white px-3 py-1.5 text-left text-xs font-semibold text-[#0F3860] hover:bg-[#0F3860]/5 disabled:opacity-50"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
                {chat.restoring && <p className="text-center text-xs text-slate-400">Đang tải cuộc trò chuyện trước...</p>}
              </div>
            )}

            {chat.messages.map((message) => (
              <ChatMessageBubble key={message.id} message={message} conversationId={chat.conversationId} onRate={chat.rate} />
            ))}
          </div>

          <footer className="border-t border-slate-200 bg-white p-3">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                submit();
              }}
              className="flex items-end gap-2"
            >
              <label htmlFor="chat-input" className="sr-only">
                Nhập tin nhắn
              </label>
              <textarea
                id="chat-input"
                ref={inputRef}
                value={draft}
                rows={1}
                maxLength={MAX_LENGTH}
                placeholder="Nhập câu hỏi của bạn..."
                onChange={(event) => {
                  setDraft(event.target.value);
                  event.target.style.height = "auto";
                  event.target.style.height = `${Math.min(event.target.scrollHeight, 112)}px`;
                }}
                onKeyDown={(event) => {
                  // Enter sends, Shift+Enter makes a new line (and Enter while typing with an IME is left alone).
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    submit();
                  }
                }}
                className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0F3860] focus:ring-2 focus:ring-[#0F3860]/20 focus:outline-none"
              />
              {chat.busy ? (
                <button type="button" onClick={chat.stop} aria-label="Dừng trả lời" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-700 text-white hover:bg-slate-800">
                  <Square className="h-4 w-4 fill-current" aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={draft.trim() === ""}
                  aria-label="Gửi tin nhắn"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E63946] text-white hover:bg-[#C62835] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <SendHorizontal className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </form>
            <p className={cn("mt-1.5 text-center text-[10px]", draft.length > MAX_LENGTH - 80 ? "font-semibold text-amber-700" : "text-slate-400")}>
              {draft.length > MAX_LENGTH - 80
                ? `${draft.length}/${MAX_LENGTH} ký tự`
                : "Trợ lý AI có thể nhầm. Hãy kiểm tra giá và thông tin trước khi đặt hàng."}
            </p>
          </footer>
        </section>
      )}
    </>
  );
}
