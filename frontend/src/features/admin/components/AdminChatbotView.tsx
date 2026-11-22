"use client";

import { useCallback, useEffect, useState } from "react";
import { Bot, CheckCircle2, ChevronLeft, ChevronRight, Clock, Loader2, MessageSquare, RefreshCw, ThumbsDown, ThumbsUp, TriangleAlert, Undo2 } from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { getChatConversation, getChatConversations, getChatHandoffs, getChatHealth, getChatStats, syncChatKnowledge, updateChatHandoff } from "../api/admin-chat.api";
import type {
  AdminChatHealth,
  AdminChatConversationDetail,
  AdminChatConversationList,
  AdminChatStats,
  AdminHandoff,
  HandoffStatus,
} from "../types/admin-chat.types";
import { formatCount } from "../utils/format";
import { AdminDialog } from "./AdminDialog";
import { BreakdownBars } from "./BreakdownBars";
import { ChatHealthPanel } from "./ChatHealthPanel";
import { StatTile } from "./StatTile";

type Tab = "handoffs" | "conversations" | "down";

const TOOL_LABEL: Record<string, string> = {
  search_products: "Tìm sản phẩm",
  get_my_order: "Tra đơn hàng",
  list_my_recent_orders: "Xem đơn gần đây",
  search_knowledge: "Tra cứu tài liệu (RAG)",
  propose_add_to_cart: "Đề xuất thêm giỏ",
  propose_reorder: "Đề xuất mua lại",
  remember_preference: "Ghi nhớ sở thích",
  contact_support: "Chuyển nhân viên",
};

const dateTime = (iso: string) => new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
const seconds = (ms: number) => `${(ms / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} giây`;
const customerName = (customer: { fullName: string; email: string } | null) => (customer ? `${customer.fullName} (${customer.email})` : "Khách vãng lai");

/** The last seven days as columns, with the days nobody chatted on shown as empty. */
function lastDays(daily: AdminChatStats["daily"]) {
  const counts = new Map(daily.map((row) => [row.day, row.count]));
  const format = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.now() - (6 - index) * 86_400_000);
    const day = format.format(date);
    return { day, label: day.slice(8, 10) + "/" + day.slice(5, 7), count: counts.get(day) ?? 0 };
  });
}

export function AdminChatbotView() {
  const { accessToken } = useAuth();
  const [stats, setStats] = useState<AdminChatStats | null>(null);
  const [health, setHealth] = useState<AdminChatHealth | null>(null);
  const [tab, setTab] = useState<Tab>("handoffs");
  const [handoffStatus, setHandoffStatus] = useState<HandoffStatus | "">("OPEN");
  const [handoffs, setHandoffs] = useState<AdminHandoff[] | null>(null);
  const [conversations, setConversations] = useState<AdminChatConversationList | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminChatConversationDetail | null>(null);
  const [reload, setReload] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncNote, setSyncNote] = useState<string | null>(null);

  const fail = (reason: unknown) => setError(reason instanceof Error ? reason.message : "Không tải được dữ liệu chatbot.");

  useEffect(() => {
    if (!accessToken) return;
    let current = true;
    getChatStats(accessToken)
      .then((data) => current && setStats(data))
      .catch((reason) => current && fail(reason));
    getChatHealth(accessToken)
      .then((data) => current && setHealth(data))
      .catch((reason) => current && fail(reason));
    return () => {
      current = false;
    };
  }, [accessToken, reload]);

  useEffect(() => {
    if (!accessToken) return;
    let current = true;
    if (tab === "handoffs") {
      getChatHandoffs(accessToken, handoffStatus || undefined)
        .then((data) => {
          if (!current) return;
          setHandoffs(data);
          setError(null);
        })
        .catch((reason) => current && fail(reason));
    } else {
      getChatConversations(accessToken, { page, ...(tab === "down" && { feedback: "DOWN" as const }) })
        .then((data) => {
          if (!current) return;
          setConversations(data);
          setError(null);
        })
        .catch((reason) => current && fail(reason));
    }
    return () => {
      current = false;
    };
  }, [accessToken, tab, handoffStatus, page, reload]);

  const openConversation = useCallback(
    async (id: string) => {
      if (!accessToken) return;
      try {
        setDetail(await getChatConversation(accessToken, id));
      } catch (reason) {
        fail(reason);
      }
    },
    [accessToken],
  );

  async function setStatus(handoff: AdminHandoff, status: HandoffStatus) {
    if (!accessToken) return;
    try {
      await updateChatHandoff(accessToken, handoff.id, status);
      setReload((value) => value + 1);
    } catch (reason) {
      fail(reason);
    }
  }

  async function sync() {
    if (!accessToken) return;
    setSyncing(true);
    setSyncNote(null);
    try {
      const result = await syncChatKnowledge(accessToken);
      setSyncNote(`Đã đồng bộ ${result.documents} tài liệu: thêm ${result.added}, cập nhật ${result.updated}, xóa ${result.removed}, giữ nguyên ${result.unchanged}.`);
      setReload((value) => value + 1);
    } catch (reason) {
      fail(reason);
    } finally {
      setSyncing(false);
    }
  }

  const days = stats ? lastDays(stats.daily) : [];
  const peak = Math.max(1, ...days.map((day) => day.count));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
            <Bot className="h-5 w-5 text-slate-500" aria-hidden />
            Chatbot AI
          </h1>
          <p className="mt-1 text-sm text-slate-500">Theo dõi hội thoại, mức hài lòng và những lời nhắn khách để lại cho nhân viên.</p>
        </div>
        <button
          type="button"
          onClick={sync}
          disabled={syncing}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {syncing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
          Đồng bộ tài liệu{stats ? ` (${stats.knowledgePassages} đoạn)` : ""}
        </button>
      </header>

      {syncNote && (
        <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {syncNote}
        </p>
      )}
      {error && (
        <p role="alert" className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          <TriangleAlert className="h-4 w-4" aria-hidden />
          {error}
        </p>
      )}

      <section aria-label="Số liệu chatbot" className="grid grid-cols-2 divide-x divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white lg:grid-cols-5 lg:divide-y-0">
        <StatTile label="Hội thoại" value={stats?.conversations ?? 0} format={formatCount} icon={<MessageSquare className="h-4 w-4" />} meta={`${formatCount(stats?.conversationsLast7Days ?? 0)} trong 7 ngày`} />
        <StatTile label="Tin nhắn của khách" value={stats?.userMessages ?? 0} format={formatCount} icon={<Bot className="h-4 w-4" />} meta={`${formatCount(stats?.answers ?? 0)} câu trả lời`} />
        <StatTile
          label="Mức hài lòng"
          value={stats?.satisfactionRate ?? 0}
          format={(value) => (stats?.satisfactionRate === null ? "—" : `${Math.round(value)}%`)}
          icon={<ThumbsUp className="h-4 w-4" />}
          meta={`👍 ${stats?.thumbsUp ?? 0} · 👎 ${stats?.thumbsDown ?? 0}`}
        />
        <StatTile label="Lời nhắn chờ xử lý" value={stats?.openHandoffs ?? 0} format={formatCount} icon={<TriangleAlert className="h-4 w-4" />} meta={`${formatCount(stats?.totalHandoffs ?? 0)} lời nhắn tất cả`} />
        <StatTile
          label="Thời gian trả lời TB"
          value={stats?.averageLatencyMs ?? 0}
          format={(value) => (stats?.averageLatencyMs === null ? "—" : seconds(value))}
          icon={<Clock className="h-4 w-4" />}
          meta="Từ lúc nhận tin đến khi trả lời xong"
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">Hội thoại mới 7 ngày qua</h2>
          <div className="mt-4 flex h-32 items-end gap-2" role="img" aria-label="Số hội thoại mới mỗi ngày trong 7 ngày qua">
            {days.map((day) => (
              <div key={day.day} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[11px] font-semibold text-slate-600 tabular-nums">{day.count}</span>
                <div className="w-full rounded-t bg-brand" style={{ height: `${Math.max(4, (day.count / peak) * 100)}%`, opacity: day.count === 0 ? 0.25 : 1 }} />
                <span className="text-[11px] text-slate-500">{day.label}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">Chức năng được dùng nhiều</h2>
          <div className="mt-4">
            {stats && stats.toolUsage.length > 0 ? (
              <BreakdownBars label="Số lần dùng từng công cụ" rows={stats.toolUsage.map((row) => ({ label: TOOL_LABEL[row.tool] ?? row.tool, value: row.count }))} />
            ) : (
              <p className="text-sm text-slate-500">Chưa có dữ liệu.</p>
            )}
          </div>
        </section>
      </div>

      <ChatHealthPanel health={health} />

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div role="tablist" aria-label="Danh sách" className="flex gap-1">
            {(
              [
                ["handoffs", `Lời nhắn cho nhân viên${stats ? ` (${stats.openHandoffs})` : ""}`],
                ["conversations", "Tất cả hội thoại"],
                ["down", `Bị 👎${stats ? ` (${stats.thumbsDown})` : ""}`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                type="button"
                onClick={() => {
                  setTab(key);
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${tab === key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {tab === "handoffs" && (
            <select value={handoffStatus} onChange={(event) => setHandoffStatus(event.target.value as HandoffStatus | "")} aria-label="Lọc theo trạng thái" className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700">
              <option value="OPEN">Chờ xử lý</option>
              <option value="RESOLVED">Đã xử lý</option>
              <option value="">Tất cả</option>
            </select>
          )}
        </div>

        {tab === "handoffs" ? (
          <ul className="divide-y divide-slate-100">
            {handoffs === null && <li className="p-6 text-sm text-slate-500">Đang tải...</li>}
            {handoffs?.length === 0 && <li className="p-6 text-sm text-slate-500">Không có lời nhắn nào.</li>}
            {handoffs?.map((handoff) => (
              <li key={handoff.id} className="space-y-2 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {handoff.contactName} <span className="font-normal text-slate-500">· {handoff.contact}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {dateTime(handoff.createdAt)} · {customerName(handoff.customer)}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${handoff.status === "OPEN" ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}>
                    {handoff.status === "OPEN" ? "Chờ xử lý" : "Đã xử lý"}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap text-slate-700">{handoff.message}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => void setStatus(handoff, handoff.status === "OPEN" ? "RESOLVED" : "OPEN")} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    {handoff.status === "OPEN" ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : <Undo2 className="h-3.5 w-3.5" aria-hidden />}
                    {handoff.status === "OPEN" ? "Đánh dấu đã xử lý" : "Mở lại"}
                  </button>
                  <button type="button" onClick={() => void openConversation(handoff.conversationId)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-brand-ink hover:bg-slate-50">
                    Xem hội thoại
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <>
            <ul className="divide-y divide-slate-100">
              {conversations === null && <li className="p-6 text-sm text-slate-500">Đang tải...</li>}
              {conversations?.items.length === 0 && <li className="p-6 text-sm text-slate-500">{tab === "down" ? "Chưa có câu trả lời nào bị đánh giá chưa hữu ích." : "Chưa có hội thoại nào."}</li>}
              {conversations?.items.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => void openConversation(item.id)} className="flex w-full items-start justify-between gap-3 p-4 text-left hover:bg-slate-50">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-900">{item.firstMessage || "(không có nội dung)"}</span>
                      <span className="block text-xs text-slate-500">
                        {customerName(item.customer)} · {item.messageCount} tin · {dateTime(item.updatedAt)}
                      </span>
                    </span>
                    <span className="flex shrink-0 gap-1.5 text-xs font-semibold">
                      {item.thumbsDown > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-rose-700">
                          <ThumbsDown className="h-3 w-3" aria-hidden />
                          {item.thumbsDown}
                        </span>
                      )}
                      {item.handoffs > 0 && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-800">Có lời nhắn</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {conversations && conversations.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
                <span>
                  Trang {conversations.pagination.page}/{conversations.pagination.totalPages} · {formatCount(conversations.pagination.totalItems)} hội thoại
                </span>
                <span className="flex gap-2">
                  <button type="button" disabled={conversations.pagination.page <= 1} onClick={() => setPage(conversations.pagination.page - 1)} aria-label="Trang trước" className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40">
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                  </button>
                  <button type="button" disabled={conversations.pagination.page >= conversations.pagination.totalPages} onClick={() => setPage(conversations.pagination.page + 1)} aria-label="Trang sau" className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40">
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </button>
                </span>
              </div>
            )}
          </>
        )}
      </section>

      {detail && (
        <AdminDialog title="Chi tiết hội thoại" size="lg" onClose={() => setDetail(null)}>
          <div className="max-h-[70vh] space-y-3 overflow-y-auto p-5">
            <p className="text-xs text-slate-500">
              {customerName(detail.customer)} · bắt đầu {dateTime(detail.createdAt)}
            </p>
            {detail.messages.map((message) => (
              <div key={message.id} className={message.role === "USER" ? "flex justify-end" : "flex"}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${message.role === "USER" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-800"}`}>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.role === "ASSISTANT" && (
                    <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                      {message.toolsUsed.map((tool) => (
                        <span key={tool} className="rounded-full bg-white px-2 py-0.5 font-semibold text-slate-600">
                          {TOOL_LABEL[tool] ?? tool}
                        </span>
                      ))}
                      {message.cards.length > 0 && <span>{message.cards.length} thẻ</span>}
                      {message.sources.length > 0 && <span>Nguồn: {message.sources.map((source) => source.title).join(", ")}</span>}
                      {message.latencyMs !== null && <span>{seconds(message.latencyMs)}</span>}
                      {message.feedback === "UP" && <ThumbsUp className="h-3.5 w-3.5 text-emerald-600" aria-label="Khách thấy hữu ích" />}
                      {message.feedback === "DOWN" && <ThumbsDown className="h-3.5 w-3.5 text-rose-600" aria-label="Khách thấy chưa hữu ích" />}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </AdminDialog>
      )}
    </div>
  );
}
