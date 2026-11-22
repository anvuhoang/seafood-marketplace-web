"use client";

import { Activity, Gauge, ShieldAlert, TriangleAlert } from "lucide-react";
import type { AdminChatHealth, LatencyStats } from "../types/admin-chat.types";
import { formatCount } from "../utils/format";
import { BreakdownBars } from "./BreakdownBars";

const INCIDENT_LABEL: Record<string, string> = {
  MODEL_RATE_LIMITED: "Gemini báo vượt hạn mức (429)",
  MODEL_TIMEOUT: "Mô hình trả lời quá chậm (timeout)",
  MODEL_UNAVAILABLE: "Mô hình không phản hồi hoặc lỗi máy chủ",
  MODEL_BLOCKED: "Nội dung bị mô hình chặn",
  MODEL_BAD_RESPONSE: "Mô hình trả dữ liệu lỗi",
  INTERNAL_ERROR: "Lỗi nội bộ của API",
  TOOL_FAILED: "Công cụ (tool) bị lỗi",
  USER_RATE_LIMITED: "Người dùng bị giới hạn tin nhắn",
  DAILY_BUDGET: "Hết ngân sách tin nhắn trong ngày",
  INJECTION: "Cố chiếm quyền bot (đã chặn)",
};

/** Incidents that mean the shop is losing answers, as opposed to the limits doing their job. */
const SERIOUS = new Set(["MODEL_RATE_LIMITED", "MODEL_TIMEOUT", "MODEL_UNAVAILABLE", "MODEL_BAD_RESPONSE", "INTERNAL_ERROR", "TOOL_FAILED"]);

const seconds = (ms: number | null) => (ms === null ? "—" : `${(ms / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} giây`);
const when = (iso: string) => new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });

function Figure({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tracking-tight text-slate-900 tabular-nums">{value}</dd>
      {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

function LatencyFigures({ stats }: { stats: LatencyStats }) {
  return (
    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Figure label="Trung bình" value={seconds(stats.averageMs)} hint={`${formatCount(stats.count)} câu trả lời`} />
      <Figure label="p50 (trung vị)" value={seconds(stats.p50Ms)} hint="Một nửa nhanh hơn mức này" />
      <Figure label="p95" value={seconds(stats.p95Ms)} hint="19/20 câu nhanh hơn mức này" />
      <Figure label="Chậm nhất" value={seconds(stats.maxMs)} />
    </dl>
  );
}

/** Speed, token use, distance to the limits and what went wrong: the "is the chatbot healthy" part of the page. */
export function ChatHealthPanel({ health }: { health: AdminChatHealth | null }) {
  if (!health) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500" aria-busy>
        Đang tải số liệu hiệu năng...
      </section>
    );
  }

  const { quota, tokens, latency, incidents, model } = health;
  const barColour = quota.usedPercent >= 80 ? "bg-rose-600" : quota.usedPercent >= 60 ? "bg-amber-500" : "bg-emerald-600";
  const peak = Math.max(1, ...latency.daily.map((day) => day.p95Ms ?? 0));
  const serious24h = incidents.last24h.filter((row) => SERIOUS.has(row.kind)).reduce((sum, row) => sum + row.count, 0);

  return (
    <section aria-label="Hiệu năng và hạn mức" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-900">Hiệu năng &amp; hạn mức</h2>
        <p className="text-xs text-slate-500">
          {model.provider === "off" ? "Chưa có mô hình" : `${model.provider} · ${model.chatModel || "mô hình mặc định"}`} · timeout {seconds(model.timeoutMs)} · tối đa {model.maxToolRounds} vòng công cụ
        </p>
      </div>

      {health.warnings.length > 0 && (
        <ul role="alert" className="space-y-1.5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {health.warnings.map((warning) => (
            <li key={warning} className="flex items-start gap-2">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {warning}
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Activity className="h-4 w-4 text-slate-400" aria-hidden />
            Độ trễ trả lời · 24 giờ qua
          </h3>
          <LatencyFigures stats={latency.last24h} />
          <p className="text-xs text-slate-500">
            7 ngày qua: trung bình {seconds(latency.last7d.averageMs)} · p95 {seconds(latency.last7d.p95Ms)} · {formatCount(latency.last7d.count)} câu trả lời
          </p>
          <div>
            <p className="text-xs font-medium text-slate-600">p95 theo ngày</p>
            {latency.daily.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Chưa có dữ liệu.</p>
            ) : (
              <ul className="mt-2 space-y-2" aria-label="Độ trễ p95 mỗi ngày">
                {latency.daily.map((day) => (
                  <li key={day.day} className="flex items-center gap-3 text-xs">
                    <span className="w-12 shrink-0 text-slate-500">{day.day.slice(8, 10)}/{day.day.slice(5, 7)}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <span className="block h-full rounded-full bg-brand" style={{ width: `${Math.max(3, ((day.p95Ms ?? 0) / peak) * 100)}%` }} />
                    </span>
                    <span className="w-28 shrink-0 text-right text-slate-600 tabular-nums">
                      p95 {seconds(day.p95Ms)} · {day.count}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Gauge className="h-4 w-4 text-slate-400" aria-hidden />
            Hạn mức và token
          </h3>

          <div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-slate-700">Tin nhắn hôm nay / ngân sách ngày</span>
              <span className="font-semibold text-slate-900 tabular-nums">
                {formatCount(quota.usedToday)} / {formatCount(quota.dailyBudget)} ({quota.usedPercent}%)
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={quota.usedPercent} aria-valuemin={0} aria-valuemax={100} aria-label="Ngân sách tin nhắn đã dùng hôm nay">
              <div className={`h-full rounded-full ${barColour}`} style={{ width: `${Math.max(quota.usedPercent, quota.usedToday > 0 ? 2 : 0)}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              Còn {formatCount(quota.remainingToday)} tin · làm mới lúc {when(quota.resetsAt)} (giờ Việt Nam) · mỗi người tối đa {quota.perPerson.messages} tin / {quota.perPerson.windowMinutes} phút
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Figure label="Token hôm nay" value={formatCount(tokens.today.input + tokens.today.output)} hint={`vào ${formatCount(tokens.today.input)} · ra ${formatCount(tokens.today.output)}`} />
            <Figure label="Token 7 ngày" value={formatCount(tokens.last7d.input + tokens.last7d.output)} hint={`vào ${formatCount(tokens.last7d.input)} · ra ${formatCount(tokens.last7d.output)}`} />
            <Figure label="TB mỗi câu trả lời" value={tokens.last7d.averagePerAnswer === null ? "—" : formatCount(tokens.last7d.averagePerAnswer)} hint="token (vào + ra)" />
            <Figure label="Lần gọi mô hình" value={formatCount(tokens.last7d.modelCalls)} hint="7 ngày, gồm cả vòng công cụ" />
          </dl>
          <p className="text-xs text-slate-500">
            Hạn mức thật của Gemini nằm trong Google AI Studio và không tra được bằng API. Số lần mô hình báo 429 ở bên dưới là dấu hiệu chạm trần.
          </p>
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ShieldAlert className="h-4 w-4 text-slate-400" aria-hidden />
            Sự cố và từ chối
          </h3>
          <p className="text-xs text-slate-500">
            {serious24h === 0 ? "Không có lỗi nào trong 24 giờ qua" : `${formatCount(serious24h)} lỗi trong 24 giờ qua`}
          </p>
        </div>

        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-3 text-xs font-medium text-slate-600">24 giờ qua</p>
            {incidents.last24h.length === 0 ? (
              <p className="text-sm text-slate-500">Không có.</p>
            ) : (
              <BreakdownBars label="Sự cố 24 giờ qua" rows={incidents.last24h.map((row) => ({ label: INCIDENT_LABEL[row.kind] ?? row.kind, value: row.count }))} />
            )}
            <p className="mt-3 text-xs text-slate-500">
              7 ngày qua: {incidents.last7d.length === 0 ? "không có" : incidents.last7d.map((row) => `${INCIDENT_LABEL[row.kind] ?? row.kind} ${row.count}`).join(" · ")}
            </p>
          </div>
          <div>
            <p className="mb-3 text-xs font-medium text-slate-600">Gần đây</p>
            {incidents.recent.length === 0 ? (
              <p className="text-sm text-slate-500">Chưa ghi nhận sự cố nào.</p>
            ) : (
              <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto text-sm">
                {incidents.recent.map((incident) => (
                  <li key={incident.id} className="py-2">
                    <p className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className={`font-medium ${SERIOUS.has(incident.kind) ? "text-rose-700" : "text-slate-800"}`}>{INCIDENT_LABEL[incident.kind] ?? incident.kind}</span>
                      <span className="text-xs text-slate-500">{when(incident.createdAt)}</span>
                    </p>
                    {incident.detail && <p className="truncate text-xs text-slate-500" title={incident.detail}>{incident.detail}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </section>
  );
}
