"use client";

import { useEffect, useState } from "react";
import { Loader2, Mic, Sparkles, Square } from "lucide-react";
import { ApiError } from "@/features/auth/api/auth.api";
import { SMART_IMPORT_TEXT_MAX, createSmartDraft, getSmartImportEnabled, transcribeRecording } from "../api/vendor-smart-import.api";
import { MAX_RECORDING_SECONDS, useRecordingSupported, useVoiceRecorder } from "../hooks/useVoiceRecorder";
import type { SmartImportDraft } from "../types/vendor-smart-import.types";
import type { ProductFormValues } from "../utils/vendor-product-form";
import { describeEngine, describeMissing, smartDraftToForm } from "../utils/vendor-smart-import";
import { dialogButton, fieldClass } from "./VendorDialog";

type Phase = "idle" | "transcribing" | "drafting";

const formatClock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

const errorMessage = (error: unknown, fallback: string) => (error instanceof ApiError ? error.message : fallback);

interface SmartImportPanelProps {
  token: string;
  /** Receives the draft as form values; the vendor still reviews and submits them. */
  onApply: (values: ProductFormValues) => void;
}

/**
 * Describe a product by typing or speaking and let the AI fill in the proposal form.
 * It saves nothing: the vendor edits the form and chooses to submit it.
 */
export function SmartImportPanel({ token, onApply }: SmartImportPanelProps) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SmartImportDraft | null>(null);
  const [engine, setEngine] = useState<string | null>(null);
  const micSupported = useRecordingSupported();

  useEffect(() => {
    let current = true;
    getSmartImportEnabled(token)
      .then((value) => current && setEnabled(value))
      .catch(() => current && setEnabled(false));
    return () => {
      current = false;
    };
  }, [token]);

  const recorder = useVoiceRecorder({
    onError: setError,
    onRecorded: async (recording) => {
      setError(null);
      setPhase("transcribing");
      try {
        const heard = await transcribeRecording(token, recording);
        setEngine(heard.engine);
        setText((current) => `${current.trim()} ${heard.text}`.trim().slice(0, SMART_IMPORT_TEXT_MAX));
      } catch (caught) {
        setError(errorMessage(caught, "Không thể chuyển giọng nói thành chữ. Vui lòng thử lại hoặc gõ mô tả."));
      } finally {
        setPhase("idle");
      }
    },
  });

  if (!enabled) return null;

  const busy = phase !== "idle";
  const canSubmit = !busy && !recorder.recording && text.trim().length >= 3;

  async function createDraft() {
    if (!canSubmit) return;
    setError(null);
    setResult(null);
    setPhase("drafting");
    try {
      const draft = await createSmartDraft(token, text.trim());
      setResult(draft);
      onApply(smartDraftToForm(draft));
    } catch (caught) {
      setError(errorMessage(caught, "Không thể tạo bản nháp. Vui lòng thử lại hoặc nhập tay bên dưới."));
    } finally {
      setPhase("idle");
    }
  }

  const missing = result ? describeMissing(result.missing) : null;

  return (
    <section aria-labelledby="smart-import-title" className="mb-4 rounded-2xl border border-brand/30 bg-brand-soft/20 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
        <div className="min-w-0">
          <h2 id="smart-import-title" className="text-sm font-bold text-slate-900">
            Nhập nhanh bằng AI
          </h2>
          <p className="mt-0.5 text-xs text-slate-600">
            Gõ hoặc nói về sản phẩm (tên, giá, đơn vị, số lượng). AI điền sẵn biểu mẫu bên dưới để bạn kiểm tra và sửa. Chưa có gì được lưu
            cho đến khi bạn đăng sản phẩm.
          </p>
        </div>
      </div>

      <label htmlFor="smart-import-text" className="mt-3 block text-xs font-semibold text-slate-700">
        Mô tả sản phẩm
      </label>
      <textarea
        id="smart-import-text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        maxLength={SMART_IMPORT_TEXT_MAX}
        rows={3}
        disabled={busy || recorder.recording}
        placeholder="Ví dụ: Tôm sú size 30 con một ký, giá 350 nghìn một ký, còn 40 ký, bắt sáng nay ở Cà Mau"
        className={fieldClass(false, "mt-1 resize-y")}
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {micSupported && (
          <button
            type="button"
            onClick={recorder.recording ? recorder.stop : recorder.start}
            disabled={busy}
            aria-pressed={recorder.recording}
            className={recorder.recording ? "inline-flex items-center gap-2 rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50" : `${dialogButton.secondary} gap-2`}
          >
            {recorder.recording ? <Square className="h-4 w-4" aria-hidden="true" /> : <Mic className="h-4 w-4" aria-hidden="true" />}
            {recorder.recording ? "Dừng ghi âm" : "Nói để nhập"}
          </button>
        )}
        <button type="button" onClick={createDraft} disabled={!canSubmit} className={dialogButton.primary}>
          {phase === "drafting" ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
          {phase === "drafting" ? "Đang tạo bản nháp..." : "Tạo bản nháp"}
        </button>
        <span className="ml-auto text-xs text-slate-500">
          {text.length}/{SMART_IMPORT_TEXT_MAX}
        </span>
      </div>

      <p role="status" aria-live="polite" className="mt-2 min-h-5 text-xs text-slate-600">
        {recorder.recording && (
          <span className="inline-flex items-center gap-1.5 font-semibold text-rose-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-rose-600 motion-reduce:animate-none" aria-hidden="true" />
            Đang ghi âm {formatClock(recorder.seconds)} / {formatClock(MAX_RECORDING_SECONDS)}
          </span>
        )}
        {phase === "transcribing" && (
          <span className="inline-flex items-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            Đang chuyển giọng nói thành chữ... Bạn có thể sửa chữ trước khi tạo bản nháp.
          </span>
        )}
        {phase === "idle" && !recorder.recording && engine && (
          <span>Giọng nói được nhận bằng: {describeEngine(engine)}. Hãy kiểm tra lại chữ trước khi tạo bản nháp.</span>
        )}
      </p>

      {error && (
        <p role="alert" className="mt-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      )}

      {result && !error && (
        <div role="status" className="mt-1 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-700">
          <p className="font-semibold text-emerald-700">Đã điền biểu mẫu bên dưới. Hãy kiểm tra lại trước khi gửi.</p>
          {missing && <p className="mt-1">Cần bổ sung: {missing}.</p>}
          {result.warnings.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-amber-800">
              {result.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
