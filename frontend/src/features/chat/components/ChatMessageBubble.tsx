"use client";

import { BookOpen, Loader2, ThumbsDown, ThumbsUp, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatFeedback, ChatMessage } from "../types/chat.types";
import { ChatCards } from "./ChatCards";
import { HandoffForm } from "./HandoffForm";
import { RichText } from "./RichText";

/** Three dots that bounce while the assistant has not started writing. */
function Typing() {
  return (
    <span className="inline-flex items-center gap-1 py-1" aria-hidden="true">
      {[0, 1, 2].map((dot) => (
        <span key={dot} className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 motion-reduce:animate-none" style={{ animationDelay: `${dot * 120}ms` }} />
      ))}
    </span>
  );
}

export function ChatMessageBubble({
  message,
  conversationId,
  onRate,
}: {
  message: ChatMessage;
  conversationId: string | null;
  onRate: (messageId: string, value: ChatFeedback) => void;
}) {
  if (message.role === "USER") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-md bg-[#0F3860] px-3.5 py-2 text-sm break-words whitespace-pre-wrap text-white">{message.content}</p>
      </div>
    );
  }

  const waiting = message.pending && message.content === "" && !message.activity;
  const canRate = !message.pending && !message.failed && !message.id.startsWith("local-");

  return (
    <div className="flex">
      <div className="min-w-0 max-w-[92%]">
        <div
          className={cn(
            "rounded-2xl rounded-bl-md px-3.5 py-2 text-sm break-words",
            message.failed ? "border border-rose-200 bg-rose-50 text-rose-900" : "bg-slate-100 text-slate-800",
          )}
        >
          {message.failed && <TriangleAlert className="mr-1.5 mb-0.5 inline h-4 w-4 text-rose-600" aria-hidden="true" />}
          {message.content && <RichText text={message.content} />}
          {waiting && <Typing />}
          {message.activity && (
            <p role="status" className="flex items-center gap-1.5 text-xs font-semibold text-[#0F3860]">
              <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              {message.activity}
            </p>
          )}
        </div>

        {message.cards.length > 0 && (
          <ChatCards cards={message.cards} renderHandoff={(card) => <HandoffForm conversationId={conversationId} reason={card.reason} />} />
        )}

        {message.sources.length > 0 && (
          <p className="mt-1.5 flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
            <BookOpen className="h-3 w-3" aria-hidden="true" />
            Nguồn:
            {message.sources.map((source) => (
              <span key={source.title} className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                {source.title}
              </span>
            ))}
          </p>
        )}

        {canRate && (
          <div className="mt-1 flex items-center gap-1" role="group" aria-label="Đánh giá câu trả lời">
            {(["UP", "DOWN"] as const).map((value) => {
              const Icon = value === "UP" ? ThumbsUp : ThumbsDown;
              const active = message.feedback === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onRate(message.id, value)}
                  aria-pressed={active}
                  aria-label={value === "UP" ? "Câu trả lời hữu ích" : "Câu trả lời chưa hữu ích"}
                  className={cn(
                    "rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700",
                    active && (value === "UP" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"),
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
