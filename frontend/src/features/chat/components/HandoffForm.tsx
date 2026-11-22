"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { ApiError } from "@/features/auth/api/auth.api";
import { useAuth } from "@/features/auth/context/AuthContext";
import { createChatHandoff } from "../api/chat.api";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0F3860] focus:ring-2 focus:ring-[#0F3860]/20 focus:outline-none";

/** The "leave a message for the support team" form shown inside the chat. */
export function HandoffForm({ conversationId, reason }: { conversationId: string | null; reason: string }) {
  const { user, accessToken } = useAuth();
  const [name, setName] = useState(user?.fullName ?? "");
  const [contact, setContact] = useState(user?.phone ?? user?.email ?? "");
  const [message, setMessage] = useState(reason);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  if (state === "sent") {
    return (
      <p role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        Đã gửi lời nhắn. Nhân viên sẽ liên hệ lại với bạn sớm nhất có thể.
      </p>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!conversationId) {
      setError("Bạn hãy nhắn một tin cho trợ lý trước, rồi gửi lời nhắn nhé.");
      return;
    }
    setState("sending");
    setError(null);
    try {
      await createChatHandoff(accessToken, { conversationId, contactName: name.trim(), contact: contact.trim(), message: message.trim() });
      setState("sent");
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : "Không thể gửi lời nhắn. Bạn thử lại nhé.");
      setState("idle");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
      <p className="text-xs font-bold text-slate-900">Để lại lời nhắn cho nhân viên</p>
      <label className="block text-[11px] font-semibold text-slate-600">
        Họ tên
        <input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={150} autoComplete="name" className={`${inputClass} mt-0.5`} />
      </label>
      <label className="block text-[11px] font-semibold text-slate-600">
        Số điện thoại hoặc email
        <input value={contact} onChange={(event) => setContact(event.target.value)} required minLength={5} maxLength={255} autoComplete="email" className={`${inputClass} mt-0.5`} />
      </label>
      <label className="block text-[11px] font-semibold text-slate-600">
        Nội dung cần hỗ trợ
        <textarea value={message} onChange={(event) => setMessage(event.target.value)} required minLength={5} maxLength={1000} rows={3} className={`${inputClass} mt-0.5 resize-none`} />
      </label>
      {error && (
        <p role="alert" className="text-xs font-semibold text-rose-700">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={state === "sending"}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#0F3860] px-3 py-2 text-xs font-bold text-white hover:bg-[#0A2744] disabled:opacity-60"
      >
        {state === "sending" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Send className="h-3.5 w-3.5" aria-hidden="true" />}
        Gửi lời nhắn
      </button>
    </form>
  );
}
